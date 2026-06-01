const express = require("express");
const cors = require("cors");
const { getDB } = require("./db");

const app = express();
const PORT = 3001;

const ADMIN_EMAILS = ["keomjongseol@gmail.com"];

app.use(cors());
app.use(express.json());

// ─── 유저 등록 / 조회 ────────────────────────────────
app.post("/api/users/login", (req, res) => {
  const { email, name, picture } = req.body;
  if (!email || !name) return res.status(400).json({ error: "이메일과 이름이 필요합니다." });

  const db = getDB();
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!existing) {
    db.prepare("INSERT INTO users (email, name, picture, points) VALUES (?, ?, ?, 0)").run(email, name, picture || null);
  } else if (picture) {
    db.prepare("UPDATE users SET picture = ? WHERE email = ?").run(picture, email);
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  res.json({ points: user.points, riot_account: user.riot_account });
});

// ─── 포인트 조회 ────────────────────────────────────
app.get("/api/users/points", (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "이메일이 필요합니다." });

  const db = getDB();
  const user = db.prepare("SELECT points FROM users WHERE email = ?").get(email);
  if (!user) return res.status(404).json({ error: "유저를 찾을 수 없습니다." });

  res.json({ points: user.points });
});

// ─── 출석 체크 ──────────────────────────────────────
app.post("/api/users/attendance", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "이메일이 필요합니다." });

  const db = getDB();

  // 한국 시간 기준 오늘 날짜 (0시 기준)
  const now = new Date();
  const koreaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const yyyy = koreaDate.getFullYear();
  const mm = String(koreaDate.getMonth() + 1).padStart(2, "0");
  const dd = String(koreaDate.getDate()).padStart(2, "0");
  const koreaDateStr = `${yyyy}-${mm}-${dd}`;

  const existing = db.prepare("SELECT * FROM attendance WHERE user_email = ? AND date = ?").get(email, koreaDateStr);
  if (existing) return res.status(400).json({ error: "이미 출석을 하였습니다!" });

  db.prepare("INSERT INTO attendance (user_email, date) VALUES (?, ?)").run(email, koreaDateStr);
  db.prepare("UPDATE users SET points = points + 10 WHERE email = ?").run(email);

  const user = db.prepare("SELECT points FROM users WHERE email = ?").get(email);
  res.json({ message: "출석 체크 되었습니다!", points: user.points });
});

// ─── 라이엇 계정 연동 ────────────────────────────────
app.post("/api/users/riot", (req, res) => {
  const { email, gameName, tagLine } = req.body;
  if (!email || !gameName || !tagLine) return res.status(400).json({ error: "필수 정보가 없습니다." });

  const db = getDB();
  const riotAccount = JSON.stringify({ gameName, tagLine });
  db.prepare("UPDATE users SET riot_account = ? WHERE email = ?").run(riotAccount, email);

  res.json({ message: "라이엇 계정이 연동되었습니다.", gameName, tagLine });
});

// ─── 라이엇 계정 해제 ────────────────────────────────
app.delete("/api/users/riot", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "이메일이 필요합니다." });

  const db = getDB();
  db.prepare("UPDATE users SET riot_account = NULL WHERE email = ?").run(email);
  res.json({ message: "라이엇 계정 연동이 해제되었습니다." });
});

// ─── 내 게시글 조회 ──────────────────────────────────
app.get("/api/users/posts", (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "이메일이 필요합니다." });

  const db = getDB();
  const posts = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
    FROM posts p
    WHERE p.author_email = ?
    ORDER BY p.created_at DESC
  `).all(email);

  res.json(posts.map(p => ({ ...p, gameData: p.game_data ? JSON.parse(p.game_data) : null })));
});

// ─── 내 댓글 조회 ────────────────────────────────────
app.get("/api/users/comments", (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "이메일이 필요합니다." });

  const db = getDB();
  const comments = db.prepare(`
    SELECT c.*, p.title as post_title
    FROM comments c
    JOIN posts p ON c.post_id = p.id
    WHERE c.author_email = ?
    ORDER BY c.created_at DESC
  `).all(email);

  res.json(comments);
});

// ─── 게시글 목록 조회 ───────────────────────────────
app.get("/api/posts", (req, res) => {
  const db = getDB();
  const posts = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
    FROM posts p
    ORDER BY p.created_at DESC
  `).all();

  const result = posts.map((post) => ({
    ...post,
    gameData: post.game_data ? JSON.parse(post.game_data) : null,
    votes: db.prepare("SELECT * FROM vote_options WHERE post_id = ?").all(post.id),
  }));

  res.json(result);
});

// ─── 게시글 단건 조회 ───────────────────────────────
app.get("/api/posts/:id", (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });

  db.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").run(id);

  const userEmail = req.query.user_email;
  const myVote = userEmail ? db.prepare("SELECT * FROM votes WHERE post_id = ? AND user_email = ?").get(id, userEmail) : null;
  const myLike = userEmail ? db.prepare("SELECT * FROM post_likes WHERE post_id = ? AND user_email = ?").get(id, userEmail) : null;
  const votes = db.prepare("SELECT * FROM vote_options WHERE post_id = ?").all(id);
  const comments = db.prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC").all(id);

  res.json({
    ...post,
    gameData: post.game_data ? JSON.parse(post.game_data) : null,
    votes,
    comments,
    my_voted_option_id: myVote ? myVote.option_id : null,
    my_like: myLike ? myLike.type : null,
  });
});

// ─── 게시글 작성 ────────────────────────────────────
app.post("/api/posts", (req, res) => {
  const { title, description, youtube_url, options, author, author_email, tier, gameData } = req.body;

  if (!title || !description || !options || options.length < 2) {
    return res.status(400).json({ error: "제목, 내용, 투표 항목(2개 이상)을 입력해주세요." });
  }

  const db = getDB();

  // 글 작성 시 50포인트 차감
  if (author_email) {
    const user = db.prepare("SELECT points FROM users WHERE email = ?").get(author_email);
    if (!user || user.points < 50) {
      return res.status(400).json({ error: "포인트가 부족합니다. (글 작성: 50포인트 필요)" });
    }
    db.prepare("UPDATE users SET points = points - 50 WHERE email = ?").run(author_email);
  }

  const result = db.prepare(`
    INSERT INTO posts (title, description, youtube_url, author, author_email, tier, game_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  `).run(title, description, youtube_url || null, author || "익명", author_email || null, tier || "UNRANKED", gameData ? JSON.stringify(gameData) : null);

  const postId = result.lastInsertRowid;
  const insertOption = db.prepare("INSERT INTO vote_options (post_id, label) VALUES (?, ?)");
  options.forEach((label) => insertOption.run(postId, label));

  res.json({ id: postId, message: "게시글이 등록되었습니다." });
});

// ─── 게시글 삭제 ────────────────────────────────────
app.delete("/api/posts/:id", (req, res) => {
  const { user_email } = req.body;
  const db = getDB();
  const id = Number(req.params.id);

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });

  const isAdminDelete = ADMIN_EMAILS.includes(user_email);
  if (!isAdminDelete) return res.status(403).json({ error: "관리자만 게시글을 삭제할 수 있습니다." });

  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  res.json({ message: "삭제되었습니다." });
});


// ─── 판정 완료 (관리자 전용) ──────────────────────────
app.post("/api/posts/:id/close", async (req, res) => {
  const { user_email, final_opinion, correct_option_id } = req.body;
  if (!ADMIN_EMAILS.includes(user_email)) {
    return res.status(403).json({ error: "관리자만 판정을 완료할 수 있습니다." });
  }
  if (!final_opinion || !correct_option_id) {
    return res.status(400).json({ error: "최종의견과 정답 항목을 선택해주세요." });
  }

  const db = getDB();
  const id = Number(req.params.id);

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
  if (post.is_closed) return res.status(400).json({ error: "이미 판정이 완료된 게시글입니다." });

  // 판정 완료 처리
  db.prepare(
    "UPDATE posts SET is_closed = 1, final_opinion = ?, correct_option_id = ? WHERE id = ?"
  ).run(final_opinion, Number(correct_option_id), id);

  // 정답 투표자에게 100포인트 지급
  const correctVoters = db.prepare(
    "SELECT user_email FROM votes WHERE post_id = ? AND option_id = ?"
  ).all(id, Number(correct_option_id));

  for (const voter of correctVoters) {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(voter.user_email);
    if (user) {
      db.prepare("UPDATE users SET points = points + 100 WHERE email = ?").run(voter.user_email);
    }
  }

  res.json({
    message: `판정이 완료되었습니다. ${correctVoters.length}명에게 100포인트가 지급되었습니다.`,
    rewarded: correctVoters.length,
  });
});

// ─── 투표 ───────────────────────────────────────────
app.post("/api/posts/:id/vote", (req, res) => {
  const { option_id, user_email } = req.body;
  if (!option_id || !user_email) return res.status(400).json({ error: "필수 정보가 없습니다." });

  const db = getDB();
  const postId = Number(req.params.id);

  const postForVote = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
  if (postForVote?.is_closed) return res.status(400).json({ error: "판정이 완료된 게시글입니다." });

  const alreadyVoted = db.prepare("SELECT * FROM votes WHERE post_id = ? AND user_email = ?").get(postId, user_email);
  if (alreadyVoted) return res.status(400).json({ error: "이미 투표하셨습니다." });

  const option = db.prepare("SELECT * FROM vote_options WHERE id = ? AND post_id = ?").get(Number(option_id), postId);
  if (!option) return res.status(404).json({ error: "투표 항목을 찾을 수 없습니다." });

  // 투표 시 10포인트 차감
  const user = db.prepare("SELECT points FROM users WHERE email = ?").get(user_email);
  if (!user || user.points < 10) {
    return res.status(400).json({ error: "포인트가 부족합니다. (투표: 10포인트 필요)" });
  }
  db.prepare("UPDATE users SET points = points - 10 WHERE email = ?").run(user_email);

  db.prepare("UPDATE vote_options SET count = count + 1 WHERE id = ?").run(Number(option_id));
  db.prepare("INSERT INTO votes (post_id, user_email, option_id) VALUES (?, ?, ?)").run(postId, user_email, Number(option_id));

  res.json({ message: "투표가 완료되었습니다." });
});

// ─── 게시글 추천/비추천 ──────────────────────────────
app.post("/api/posts/:id/like", (req, res) => {
  const { type, user_email } = req.body;
  if (!user_email) return res.status(400).json({ error: "로그인이 필요합니다." });

  const db = getDB();
  const postId = Number(req.params.id);

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });

  const existing = db.prepare("SELECT * FROM post_likes WHERE post_id = ? AND user_email = ?").get(postId, user_email);

  if (existing) {
    if (existing.type === type) {
      db.prepare("DELETE FROM post_likes WHERE post_id = ? AND user_email = ?").run(postId, user_email);
      const col = type === "like" ? "likes" : "dislikes";
      db.prepare(`UPDATE posts SET ${col} = ${col} - 1 WHERE id = ?`).run(postId);
    } else {
      db.prepare("UPDATE post_likes SET type = ? WHERE post_id = ? AND user_email = ?").run(type, postId, user_email);
      if (type === "like") {
        db.prepare("UPDATE posts SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = ?").run(postId);
      } else {
        db.prepare("UPDATE posts SET dislikes = dislikes + 1, likes = likes - 1 WHERE id = ?").run(postId);
      }
    }
  } else {
    db.prepare("INSERT INTO post_likes (post_id, user_email, type) VALUES (?, ?, ?)").run(postId, user_email, type);
    const col = type === "like" ? "likes" : "dislikes";
    db.prepare(`UPDATE posts SET ${col} = ${col} + 1 WHERE id = ?`).run(postId);
  }

  const updated = db.prepare("SELECT likes, dislikes FROM posts WHERE id = ?").get(postId);
  res.json({ likes: updated.likes, dislikes: updated.dislikes });
});

// ─── 댓글 작성 ──────────────────────────────────────
app.post("/api/posts/:id/comments", (req, res) => {
  const { content, author, tier, author_email } = req.body;
  if (!content) return res.status(400).json({ error: "댓글 내용을 입력해주세요." });

  const db = getDB();
  const postId = Number(req.params.id);

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
  if (post.is_closed) return res.status(400).json({ error: "판정이 완료된 게시글입니다." });

  // 댓글 작성 시 100포인트 차감
  if (author_email) {
    const user = db.prepare("SELECT points FROM users WHERE email = ?").get(author_email);
    if (!user || user.points < 100) {
      return res.status(400).json({ error: "포인트가 부족합니다. (댓글: 100포인트 필요)" });
    }
    db.prepare("UPDATE users SET points = points - 100 WHERE email = ?").run(author_email);
  }

  const result = db.prepare(`
    INSERT INTO comments (post_id, author, author_email, tier, content, created_at)
    VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  `).run(postId, author || "익명", author_email || null, tier || "UNRANKED", content);

  res.json({ id: result.lastInsertRowid, message: "댓글이 등록되었습니다." });
});

// ─── 댓글 삭제 ──────────────────────────────────────
app.delete("/api/comments/:id", (req, res) => {
  const { user_email } = req.body;
  const db = getDB();

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(Number(req.params.id));
  if (!comment) return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });

  const isAdmin = ADMIN_EMAILS.includes(user_email);
  if (!isAdmin && comment.author_email !== user_email) return res.status(403).json({ error: "삭제 권한이 없습니다." });

  db.prepare("DELETE FROM comments WHERE id = ?").run(Number(req.params.id));
  res.json({ message: "삭제되었습니다." });
});

// ─── 댓글 추천 ──────────────────────────────────────
app.post("/api/comments/:id/like", (req, res) => {
  const { user_email } = req.body;
  if (!user_email) return res.status(400).json({ error: "로그인이 필요합니다." });

  const db = getDB();
  const commentId = Number(req.params.id);

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId);
  if (!comment) return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });

  const existing = db.prepare("SELECT * FROM comment_likes WHERE comment_id = ? AND user_email = ?").get(commentId, user_email);

  if (existing) {
    db.prepare("DELETE FROM comment_likes WHERE comment_id = ? AND user_email = ?").run(commentId, user_email);
    db.prepare("UPDATE comments SET likes = likes - 1 WHERE id = ?").run(commentId);
  } else {
    db.prepare("INSERT INTO comment_likes (comment_id, user_email) VALUES (?, ?)").run(commentId, user_email);
    db.prepare("UPDATE comments SET likes = likes + 1 WHERE id = ?").run(commentId);
  }

  const updated = db.prepare("SELECT likes FROM comments WHERE id = ?").get(commentId);
  res.json({ likes: updated.likes });
});

// ─── 실제 Riot API ───────────────────────────────────
const fs = require("fs");
const path = require("path");

// .env에서 API 키 로드
function getRiotApiKey() {
  try {
    const envPath = path.join(__dirname, ".env");
    const env = fs.readFileSync(envPath, "utf-8");
    const match = env.match(/RIOT_API_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

const POS_KR = { TOP: "탑", JUNGLE: "정글", MIDDLE: "미드", BOTTOM: "원딜", UTILITY: "서포터" };
const POS_EN = { TOP: "TOP", JUNGLE: "JGL", MIDDLE: "MID", BOTTOM: "BOT", UTILITY: "SUP" };

function detectKeyMoments(winProb) {
  if (!winProb || winProb.length < 2) return [];
  const candidates = [];
  for (let i = 1; i < winProb.length; i++) {
    const change = winProb[i].prob - winProb[i - 1].prob;
    candidates.push({
      minute: winProb[i].minute,
      prob: winProb[i].prob,
      change,
      label: change > 0 ? "승률 급반전 ↑" : "승률 급하락 ↓",
      isPositive: change > 0,
    });
  }
  // 변동 절댓값 기준 내림차순 정렬 후 top 3 추출, 시간순으로 반환
  return candidates
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)
    .sort((a, b) => a.minute - b.minute);
}

app.get("/api/riot/summoner", async (req, res) => {
  const { gameName, tagLine } = req.query;
  if (!gameName || !tagLine) return res.status(400).json({ error: "소환사 이름과 태그를 입력해주세요." });

  const RIOT_KEY = getRiotApiKey();
  if (!RIOT_KEY) return res.status(500).json({ error: "Riot API 키가 설정되지 않았습니다." });

  try {
    // 1. PUUID 조회
    const accountRes = await fetch(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      { headers: { "X-Riot-Token": RIOT_KEY } }
    );
    if (!accountRes.ok) return res.status(404).json({ error: "소환사를 찾을 수 없습니다." });
    const account = await accountRes.json();
    const puuid = account.puuid;

    // 2. 최근 10경기 조회 (queue 구분 없이)
    const matchIdsRes = await fetch(
      `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=10`,
      { headers: { "X-Riot-Token": RIOT_KEY } }
    );
    const matchIds = await matchIdsRes.json();
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return res.status(404).json({ error: "최근 게임 기록이 없습니다." });
    }

    // 3. 각 게임 상세 + 타임라인 조회
    const games = await Promise.all(matchIds.map(async (matchId) => {
      try {
        const [matchRes, timelineRes] = await Promise.all([
          fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`, { headers: { "X-Riot-Token": RIOT_KEY } }),
          fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`, { headers: { "X-Riot-Token": RIOT_KEY } }),
        ]);
        const match = await matchRes.json();
        const timeline = await timelineRes.json();

        const info = match.info;
        const participant = info.participants.find(p => p.puuid === puuid);
        if (!participant) return null;

        const win = participant.win;
        const kills = participant.kills;
        const deaths = participant.deaths;
        const assists = participant.assists;
        const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;
        const visionScore = participant.visionScore;
        const damageDealt = participant.totalDamageDealtToChampions;
        const duration = info.gameDuration;
        const durMin = Math.floor(duration / 60);
        const champion = participant.championName;
        const position = participant.teamPosition || "UNKNOWN";

        // 팀 구성
        const blueTeam = info.participants.filter(p => p.teamId === 100).map(p => ({
          champion: p.championName,
          role: POS_KR[p.teamPosition] || p.teamPosition,
          isPlayer: p.puuid === puuid,
        }));
        const redTeam = info.participants.filter(p => p.teamId === 200).map(p => ({
          champion: p.championName,
          role: POS_KR[p.teamPosition] || p.teamPosition,
          isPlayer: false,
        }));

        // 타임라인에서 피처 추출
        const frames = timeline.info.frames;
        const DROP_MINUTES = 0;
        const isBlueTeam = participant.teamId === 100;
        const playerParticipantId = participant.participantId;
        const blueIds = info.participants.filter(p => p.teamId === 100).map(p => p.participantId);
        const redIds = info.participants.filter(p => p.teamId === 200).map(p => p.participantId);

        // 오브젝트 누적 (분 단위)
        let b_top = 0, b_mid = 0, b_bot = 0;
        let r_top = 0, r_mid = 0, r_bot = 0;
        let b_dragon = 0, b_horde = 0, b_herald = 0, b_baron = 0;
        let r_dragon = 0, r_horde = 0, r_herald = 0, r_baron = 0;

        const frameFeatures = [];
        const keyEvents = [];
        let firstBloodDone = false;

        // 참가자 ID → 챔피언명 맵
        const pidToChamp = {};
        for (const p of info.participants) {
          pidToChamp[p.participantId] = p.championName;
        }

        for (let minute = 0; minute < frames.length; minute++) {
          const frame = frames[minute];

          // 오브젝트 이벤트 처리
          for (const event of (frame.events || [])) {
            if (event.type === "BUILDING_KILL") {
              const isBlueSide = event.teamId === 100;
              if (event.buildingType === "TOWER_BUILDING") {
                const lane = event.laneType;
                if (isBlueSide) {
                  if (lane === "TOP_LANE") r_top = 1;
                  else if (lane === "MID_LANE") r_mid = 1;
                  else if (lane === "BOT_LANE") r_bot = 1;
                } else {
                  if (lane === "TOP_LANE") b_top = 1;
                  else if (lane === "MID_LANE") b_mid = 1;
                  else if (lane === "BOT_LANE") b_bot = 1;
                }
              }
            }

            // 오브젝트 킬 이벤트
            if (event.type === "ELITE_MONSTER_KILL") {
              const isBlueKill = blueIds.includes(event.killerId);
              const monster = event.monsterType;
              if (isBlueKill) {
                if (monster === "DRAGON") b_dragon++;
                else if (monster === "HORDE") b_horde++;
                else if (monster === "RIFTHERALD") b_herald++;
                else if (monster === "BARON_NASHOR") b_baron++;
              } else {
                if (monster === "DRAGON") r_dragon++;
                else if (monster === "HORDE") r_horde++;
                else if (monster === "RIFTHERALD") r_herald++;
                else if (monster === "BARON_NASHOR") r_baron++;
              }
              const eMin = Math.floor((event.timestamp || 0) / 60000);
              const monsterLabel = monster === "DRAGON" ? "드래곤" : monster === "BARON_NASHOR" ? "바론 나스" : monster === "RIFTHERALD" ? "전령" : monster === "HORDE" ? "유충" : monster;
              keyEvents.push({
                minute: eMin,
                type: monster.toLowerCase(),
                label: monsterLabel,
                isBlue: isBlueKill,
                showTeam: true,
              });
            }

            // 챔피언 킬 이벤트
            if (event.type === "CHAMPION_KILL") {
              const eMin = Math.floor((event.timestamp || 0) / 60000);
              const killerChamp = pidToChamp[event.killerId] || "?";
              const victimChamp = pidToChamp[event.victimId] || "?";
              const isBlueKill = blueIds.includes(event.killerId);

              if (!firstBloodDone) {
                firstBloodDone = true;
                keyEvents.push({
                  minute: eMin,
                  type: "firstBlood",
                  label: `퍼스트 블러드: ${killerChamp}→${victimChamp} 처치`,
                  isBlue: isBlueKill,
                  showTeam: false,
                });
              } else {
                keyEvents.push({
                  minute: eMin,
                  type: "kill",
                  label: `${killerChamp}→${victimChamp} 처치`,
                  isBlue: isBlueKill,
                  showTeam: false,
                });
              }
            }
          }

          if (minute < DROP_MINUTES) continue;

          const pFrames = frame.participantFrames;
          const b_gold = blueIds.reduce((s, id) => s + (pFrames[String(id)]?.totalGold || 0), 0);
          const r_gold = redIds.reduce((s, id) => s + (pFrames[String(id)]?.totalGold || 0), 0);
          const b_xp = blueIds.reduce((s, id) => s + (pFrames[String(id)]?.xp || 0), 0);
          const r_xp = redIds.reduce((s, id) => s + (pFrames[String(id)]?.xp || 0), 0);

          frameFeatures.push({
            blue_gold: b_gold, red_gold: r_gold,
            blue_xp: b_xp, red_xp: r_xp,
            top_tower: b_top - r_top, mid_tower: b_mid - r_mid, bot_tower: b_bot - r_bot,
            dragon: b_dragon - r_dragon, horde: b_horde - r_horde, riftherald: b_herald - r_herald, baron: b_baron - r_baron,
          });
        }

        // LSTM 승률 예측
        let winProbability = [];
        try {
          const predictRes = await fetch("http://localhost:5001/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frames: frameFeatures }),
          });
          const predictData = await predictRes.json();
          const rawProbs = predictData.win_probability || [];
          // 레드팀이면 승률 뒤집기 (블루팀 승률 → 내 팀 승률)
          winProbability = rawProbs.map(d => ({
            minute: d.minute,
            prob: isBlueTeam ? Math.round(d.prob) : Math.round(100 - d.prob),
          }));
        } catch (e) {
          console.error("LSTM 예측 실패:", e.message);
        }

        const keyMoments = detectKeyMoments(winProbability);

        return {
          gameId: matchId,
          champion,
          position: POS_EN[position] || position,
          positionKr: POS_KR[position] || position,
          win,
          kills, deaths, assists,
          kda: ((kills + assists) / Math.max(1, deaths)).toFixed(2),
          cs, visionScore, damageDealt,
          duration,
          durationStr: `${durMin}:${String(duration % 60).padStart(2, "0")}`,
          date: new Date(info.gameCreation).toISOString(),
          summonerName: gameName,
          tagLine,
          winProbability,
          keyEvents: keyEvents,  // 전체 이벤트
          keyMoments,
          blueTeam,
          redTeam,
        };
      } catch (e) {
        console.error("게임 처리 오류:", e.message);
        return null;
      }
    }));

    res.json({ summonerName: gameName, tagLine, games: games.filter(Boolean) });

  } catch (e) {
    console.error("Riot API 오류:", e.message);
    res.status(500).json({ error: "Riot API 호출 중 오류가 발생했습니다." });
  }
});

// ─── LSTM 승률 예측 ──────────────────────────────────
app.post("/api/predict/winrate", async (req, res) => {
  const { frames } = req.body;
  if (!frames || frames.length === 0) {
    return res.status(400).json({ error: "frames 데이터가 필요합니다." });
  }

  try {
    const response = await fetch("http://localhost:5001/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frames }),
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: "AI 예측 서버에 연결할 수 없습니다." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📁 DB 저장 위치: db.sqlite`);
});

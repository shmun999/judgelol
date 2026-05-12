const express = require("express");
const cors = require("cors");
const { readDB, writeDB, nextId } = require("./db");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── 게시글 목록 조회 ───────────────────────────────
app.get("/api/posts", (req, res) => {
  const db = readDB();
  const posts = db.posts
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((post) => ({
      ...post,
      votes: db.voteOptions.filter((v) => v.post_id === post.id),
      comment_count: db.comments.filter((c) => c.post_id === post.id).length,
    }));
  res.json(posts);
});

// ─── 게시글 단건 조회 ───────────────────────────────
app.get("/api/posts/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const post = db.posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });

  const userEmail = req.query.user_email;
  const myVote = userEmail && db.votes
    ? db.votes.find((v) => v.post_id === id && v.user_email === userEmail)
    : null;

  const myLike = userEmail && db.postLikes
    ? db.postLikes.find((l) => l.post_id === id && l.user_email === userEmail)
    : null;

  res.json({
    ...post,
    votes: db.voteOptions.filter((v) => v.post_id === id),
    comments: db.comments
      .filter((c) => c.post_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    my_voted_option_id: myVote ? myVote.option_id : null,
    my_like: myLike ? myLike.type : null,
  });
});

// ─── 게시글 작성 ────────────────────────────────────
app.post("/api/posts", (req, res) => {
  const { title, description, youtube_url, options, author, tier, gameData } = req.body;

  if (!title || !description || !options || options.length < 2) {
    return res.status(400).json({ error: "제목, 내용, 투표 항목(2개 이상)을 입력해주세요." });
  }

  const db = readDB();
  const id = nextId(db, "posts");

  const post = {
    id,
    title,
    description,
    youtube_url: youtube_url || null,
    author: author || "익명",
    tier: tier || "UNRANKED",
    views: 0,
    likes: 0,
    dislikes: 0,
    gameData: gameData || null,
    created_at: new Date().toISOString(),
  };

  db.posts.push(post);

  options.forEach((label) => {
    db.voteOptions.push({
      id: nextId(db, "voteOptions"),
      post_id: id,
      label,
      count: 0,
    });
  });

  writeDB(db);
  res.json({ id, message: "게시글이 등록되었습니다." });
});

// ─── 투표 ───────────────────────────────────────────
app.post("/api/posts/:id/vote", (req, res) => {
  const { option_id, user_email } = req.body;
  if (!option_id || !user_email) return res.status(400).json({ error: "필수 정보가 없습니다." });

  const db = readDB();

  // 이미 투표했는지 확인
  const alreadyVoted = db.votes && db.votes.some(
    (v) => v.post_id === Number(req.params.id) && v.user_email === user_email
  );
  if (alreadyVoted) return res.status(400).json({ error: "이미 투표하셨습니다." });

  const option = db.voteOptions.find(
    (v) => v.id === Number(option_id) && v.post_id === Number(req.params.id)
  );
  if (!option) return res.status(404).json({ error: "투표 항목을 찾을 수 없습니다." });

  option.count++;

  // 투표 기록 저장
  if (!db.votes) db.votes = [];
  db.votes.push({ post_id: Number(req.params.id), user_email, option_id: Number(option_id) });

  writeDB(db);
  res.json({ message: "투표가 완료되었습니다." });
});

// ─── 댓글 작성 ──────────────────────────────────────
app.post("/api/posts/:id/comments", (req, res) => {
  const { content, author, tier, author_email } = req.body;
  if (!content) return res.status(400).json({ error: "댓글 내용을 입력해주세요." });

  const db = readDB();
  const post = db.posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });

  const comment = {
    id: nextId(db, "comments"),
    post_id: Number(req.params.id),
    author: author || "익명",
    author_email: author_email || null,
    tier: tier || "UNRANKED",
    content,
    likes: 0,
    created_at: new Date().toISOString(),
  };

  db.comments.push(comment);
  writeDB(db);
  res.json({ id: comment.id, message: "댓글이 등록되었습니다." });
});

// ─── 게시글 추천/비추천 ──────────────────────────────
app.post("/api/posts/:id/like", (req, res) => {
  const { type, user_email } = req.body; // type: 'like' or 'dislike'
  if (!user_email) return res.status(400).json({ error: "로그인이 필요합니다." });

  const db = readDB();
  if (!db.postLikes) db.postLikes = [];

  const existing = db.postLikes.find(
    (l) => l.post_id === Number(req.params.id) && l.user_email === user_email
  );

  const post = db.posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });

  if (existing) {
    if (existing.type === type) {
      // 같은 버튼 다시 누르면 취소
      if (type === "like") post.likes--;
      else post.dislikes--;
      db.postLikes = db.postLikes.filter(
        (l) => !(l.post_id === Number(req.params.id) && l.user_email === user_email)
      );
    } else {
      // 반대 버튼 누르면 전환
      if (type === "like") { post.likes++; post.dislikes--; }
      else { post.dislikes++; post.likes--; }
      existing.type = type;
    }
  } else {
    if (type === "like") post.likes++;
    else post.dislikes++;
    db.postLikes.push({ post_id: Number(req.params.id), user_email, type });
  }

  writeDB(db);
  res.json({ likes: post.likes, dislikes: post.dislikes });
});
// ─── 댓글 추천 (1인 1회) ────────────────────────────
app.post("/api/comments/:id/like", (req, res) => {
  const { user_email } = req.body;
  if (!user_email) return res.status(400).json({ error: "로그인이 필요합니다." });

  const db = readDB();
  if (!db.commentLikes) db.commentLikes = [];

  const comment = db.comments.find((c) => c.id === Number(req.params.id));
  if (!comment) return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });

  const existing = db.commentLikes.find(
    (l) => l.comment_id === Number(req.params.id) && l.user_email === user_email
  );

  if (existing) {
    // 이미 눌렀으면 취소
    comment.likes--;
    db.commentLikes = db.commentLikes.filter(
      (l) => !(l.comment_id === Number(req.params.id) && l.user_email === user_email)
    );
  } else {
    comment.likes++;
    db.commentLikes.push({ comment_id: Number(req.params.id), user_email });
  }

  writeDB(db);
  res.json({ likes: comment.likes });
});

// ─── 댓글 삭제 ──────────────────────────────────────
app.delete("/api/comments/:id", (req, res) => {
  const { user_email } = req.body;
  const db = readDB();

  const comment = db.comments.find((c) => c.id === Number(req.params.id));
  if (!comment) return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
  if (comment.author_email !== user_email) return res.status(403).json({ error: "삭제 권한이 없습니다." });

  db.comments = db.comments.filter((c) => c.id !== Number(req.params.id));
  writeDB(db);
  res.json({ message: "삭제되었습니다." });
});

// ─── Mock Riot API ────────────────────────────────────────────────

const MOCK_CHAMPS = [
  { kr: "징크스", pos: "BOT" }, { kr: "야스오", pos: "MID" },
  { kr: "제드", pos: "MID" }, { kr: "케인", pos: "JGL" },
  { kr: "카이사", pos: "BOT" }, { kr: "세나", pos: "SUP" },
  { kr: "리신", pos: "JGL" }, { kr: "나미", pos: "SUP" },
  { kr: "갱플랭크", pos: "TOP" }, { kr: "그레이브즈", pos: "JGL" },
  { kr: "르블랑", pos: "MID" }, { kr: "조이", pos: "MID" },
  { kr: "렉사이", pos: "JGL" }, { kr: "바루스", pos: "BOT" },
  { kr: "다리우스", pos: "TOP" }, { kr: "피오라", pos: "TOP" },
  { kr: "라칸", pos: "SUP" }, { kr: "루시안", pos: "BOT" },
  { kr: "에코", pos: "JGL" }, { kr: "오리아나", pos: "MID" },
  { kr: "카르마", pos: "SUP" }, { kr: "아펠리오스", pos: "BOT" },
];

const POS_KR = { TOP: "탑", JGL: "정글", MID: "미드", BOT: "원딜", SUP: "서포터" };

function generateWinProb(win, durationMin) {
  const pts = [];
  let p = 50;

  // 극적인 흐름을 위해 2~3개의 큰 전환점 미리 설정
  const numSwings = 2 + Math.floor(Math.random() * 2);
  const swingAt = [];
  for (let i = 0; i < numSwings; i++) {
    const m = Math.floor(6 + ((i + 1) * (durationMin - 8)) / (numSwings + 1));
    // 첫 번째는 패배 방향, 두 번째는 승리 방향 ... 마지막은 최종 결과 방향
    const toWin = i % 2 === (win ? 1 : 0);
    swingAt.push({ m, toWin });
  }

  for (let m = 0; m <= durationMin; m++) {
    const swing = swingAt.find((s) => Math.abs(s.m - m) <= 1);
    if (swing) {
      const force = 18 + Math.random() * 18; // 18~36% 급변
      p += swing.toWin ? force : -force;
    } else {
      p += (Math.random() - 0.49) * 5;
    }
    // 최종 결과 쪽으로 서서히 수렴
    const progress = m / durationMin;
    p += ((win ? 68 : 32) - p) * progress * 0.04;
    p = Math.max(8, Math.min(92, p));
    pts.push({ minute: m, prob: Math.round(p) });
  }
  pts[pts.length - 1].prob = win
    ? 82 + Math.floor(Math.random() * 12)
    : 5 + Math.floor(Math.random() * 10);
  return pts;
}

function generateKeyEvents(win, durationMin) {
  const events = [];
  const used = new Set();

  const fb = 2 + Math.floor(Math.random() * 3);
  events.push({ minute: fb, type: "firstBlood", label: "퍼스트 블러드", isOurs: Math.random() > 0.4 });
  used.add(fb);

  let dc = 0;
  for (const m of [5, 9, 13, 18, 23]) {
    if (m < durationMin - 2 && dc < 3 && !used.has(m)) {
      events.push({ minute: m, type: "dragon", label: `드래곤 ${++dc}`, isOurs: win ? Math.random() > 0.3 : Math.random() > 0.65 });
      used.add(m);
    }
  }

  if (durationMin > 22) {
    const bt = [20, 24, 27, 30].find((m) => m < durationMin - 2 && !used.has(m));
    if (bt) {
      events.push({ minute: bt, type: "baron", label: "바론 나스", isOurs: win ? Math.random() > 0.35 : Math.random() > 0.7 });
    }
  }

  return events.sort((a, b) => a.minute - b.minute);
}

function detectKeyMoments(winProb) {
  if (!winProb || winProb.length < 6) return [];
  const W = 4; // 앞뒤 4분 비교
  const candidates = [];

  for (let i = W; i < winProb.length - W; i++) {
    const change = winProb[i + W].prob - winProb[i - W].prob;
    if (Math.abs(change) >= 18) {
      candidates.push({
        minute: winProb[i].minute,
        prob: winProb[i].prob,
        change,
        label: change > 0 ? "승률 급반전 ↑" : "승률 급하락 ↓",
        isPositive: change > 0,
      });
    }
  }

    // 겹치는 구간 제거 (5분 이내 중복 제거)
  const deduped = [];
  candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  for (const c of candidates) {
    if (!deduped.some((d) => Math.abs(d.minute - c.minute) < 5)) {
      deduped.push(c);
      if (deduped.length >= 3) break;
    }
  }
  return deduped.sort((a, b) => a.minute - b.minute);
}

function generateTeams(playerChamp, playerPos) {
  const roles = ["TOP", "JGL", "MID", "BOT", "SUP"];
  const blueTeam = roles.map((role) => {
    if (role === playerPos)
      return { champion: playerChamp, role: POS_KR[role], isPlayer: true };
    const candidates = MOCK_CHAMPS.filter((c) => c.pos === role);
    const champ = candidates[Math.floor(Math.random() * candidates.length)] || MOCK_CHAMPS[0];
    return { champion: champ.kr, role: POS_KR[role], isPlayer: false };
  });
  const redTeam = roles.map((role) => {
    const candidates = MOCK_CHAMPS.filter((c) => c.pos === role);
    const champ = candidates[Math.floor(Math.random() * candidates.length)] || MOCK_CHAMPS[0];
    return { champion: champ.kr, role: POS_KR[role], isPlayer: false };
  });
  return { blueTeam, redTeam };
}

app.get("/api/riot/summoner", (req, res) => {
  const { gameName, tagLine } = req.query;
  if (!gameName || !tagLine)
    return res.status(400).json({ error: "소환사 이름과 태그를 입력해주세요." });

  const games = Array.from({ length: 7 }, (_, i) => {
    const champ = MOCK_CHAMPS[Math.floor(Math.random() * MOCK_CHAMPS.length)];
    const win = Math.random() > 0.45;
    const k = Math.floor(Math.random() * 14) + 1;
    const d = Math.floor(Math.random() * 7) + 1;
    const a = Math.floor(Math.random() * 12);
    const durMin = 18 + Math.floor(Math.random() * 22);
    const durSec = durMin * 60 + Math.floor(Math.random() * 60);
    const { blueTeam, redTeam } = generateTeams(champ.kr, champ.pos);
  
  const winProb = generateWinProb(win, durMin);

    return {
      gameId: `KR_${7234560000 + i * 1000 + Math.floor(Math.random() * 999)}`,
      champion: champ.kr,
      position: champ.pos,
      positionKr: POS_KR[champ.pos],
      win,
      kills: k, deaths: d, assists: a,
      kda: ((k + a) / Math.max(1, d)).toFixed(2),
      cs: 120 + Math.floor(Math.random() * 200),
      visionScore: 8 + Math.floor(Math.random() * 40),
      duration: durSec,
      durationStr: `${durMin}:${String(durSec % 60).padStart(2, "0")}`,
      damageDealt: 12000 + Math.floor(Math.random() * 55000),
      date: new Date(Date.now() - i * 1000 * 60 * (60 + Math.floor(Math.random() * 120))).toISOString(),
      summonerName: gameName,
      tagLine,
      winProbability: winProb,
      keyEvents: generateKeyEvents(win, durMin),
      keyMoments: detectKeyMoments(winProb),
      blueTeam,
      redTeam,
    };
  });

  res.json({ summonerName: gameName, tagLine, games });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📁 데이터 저장 위치: db.json`);
});

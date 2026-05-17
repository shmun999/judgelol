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

  // 한국 시간 기준 오늘 날짜
  const koreaDate = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, "-").replace(".", "");

  const existing = db.prepare("SELECT * FROM attendance WHERE user_email = ? AND date = ?").get(email, koreaDate);
  if (existing) return res.status(400).json({ error: "이미 출석을 하였습니다!" });

  db.prepare("INSERT INTO attendance (user_email, date) VALUES (?, ?)").run(email, koreaDate);
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

  const isAdmin = ADMIN_EMAILS.includes(user_email);
  if (!isAdmin && post.author_email !== user_email) return res.status(403).json({ error: "삭제 권한이 없습니다." });

  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  res.json({ message: "삭제되었습니다." });
});

// ─── 투표 ───────────────────────────────────────────
app.post("/api/posts/:id/vote", (req, res) => {
  const { option_id, user_email } = req.body;
  if (!option_id || !user_email) return res.status(400).json({ error: "필수 정보가 없습니다." });

  const db = getDB();
  const postId = Number(req.params.id);

  const alreadyVoted = db.prepare("SELECT * FROM votes WHERE post_id = ? AND user_email = ?").get(postId, user_email);
  if (alreadyVoted) return res.status(400).json({ error: "이미 투표하셨습니다." });

  const option = db.prepare("SELECT * FROM vote_options WHERE id = ? AND post_id = ?").get(Number(option_id), postId);
  if (!option) return res.status(404).json({ error: "투표 항목을 찾을 수 없습니다." });

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

// ─── Mock Riot API ───────────────────────────────────
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
  const numSwings = 2 + Math.floor(Math.random() * 2);
  const swingAt = [];
  for (let i = 0; i < numSwings; i++) {
    const m = Math.floor(6 + ((i + 1) * (durationMin - 8)) / (numSwings + 1));
    const toWin = i % 2 === (win ? 1 : 0);
    swingAt.push({ m, toWin });
  }
  for (let m = 0; m <= durationMin; m++) {
    const swing = swingAt.find((s) => Math.abs(s.m - m) <= 1);
    if (swing) {
      const force = 18 + Math.random() * 18;
      p += swing.toWin ? force : -force;
    } else {
      p += (Math.random() - 0.49) * 5;
    }
    const progress = m / durationMin;
    p += ((win ? 68 : 32) - p) * progress * 0.04;
    p = Math.max(8, Math.min(92, p));
    pts.push({ minute: m, prob: Math.round(p) });
  }
  pts[pts.length - 1].prob = win ? 82 + Math.floor(Math.random() * 12) : 5 + Math.floor(Math.random() * 10);
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
    if (bt) events.push({ minute: bt, type: "baron", label: "바론 나스", isOurs: win ? Math.random() > 0.35 : Math.random() > 0.7 });
  }
  return events.sort((a, b) => a.minute - b.minute);
}

function detectKeyMoments(winProb) {
  if (!winProb || winProb.length < 6) return [];
  const W = 4;
  const candidates = [];
  for (let i = W; i < winProb.length - W; i++) {
    const change = winProb[i + W].prob - winProb[i - W].prob;
    if (Math.abs(change) >= 18) {
      candidates.push({ minute: winProb[i].minute, prob: winProb[i].prob, change, label: change > 0 ? "승률 급반전 ↑" : "승률 급하락 ↓", isPositive: change > 0 });
    }
  }
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
    if (role === playerPos) return { champion: playerChamp, role: POS_KR[role], isPlayer: true };
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
  if (!gameName || !tagLine) return res.status(400).json({ error: "소환사 이름과 태그를 입력해주세요." });

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
      champion: champ.kr, position: champ.pos, positionKr: POS_KR[champ.pos],
      win, kills: k, deaths: d, assists: a,
      kda: ((k + a) / Math.max(1, d)).toFixed(2),
      cs: 120 + Math.floor(Math.random() * 200),
      visionScore: 8 + Math.floor(Math.random() * 40),
      duration: durSec, durationStr: `${durMin}:${String(durSec % 60).padStart(2, "0")}`,
      damageDealt: 12000 + Math.floor(Math.random() * 55000),
      date: new Date(Date.now() - i * 1000 * 60 * (60 + Math.floor(Math.random() * 120))).toISOString(),
      summonerName: gameName, tagLine,
      winProbability: winProb, keyEvents: generateKeyEvents(win, durMin),
      keyMoments: detectKeyMoments(winProb), blueTeam, redTeam,
    };
  });

  res.json({ summonerName: gameName, tagLine, games });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📁 DB 저장 위치: db.sqlite`);
});

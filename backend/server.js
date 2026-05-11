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
  const { title, description, youtube_url, options, author, tier } = req.body;

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

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📁 데이터 저장 위치: db.json`);
});

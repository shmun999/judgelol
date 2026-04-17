import { useState } from "react";
import {
  Play,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { MOCK_POSTS, MOCK_COMMENTS, TIER_COLORS } from "../data/mockData";

export default function DetailPage({ postId, navigate }) {
  const post = MOCK_POSTS.find((p) => p.id === postId) || MOCK_POSTS[0];
  const [votedFor, setVotedFor] = useState(null);
  const [votes, setVotes] = useState(post.votes);
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState("");

  const totalVotes = votes.reduce((a, b) => a + b.count, 0);

  const handleVote = (idx) => {
    if (votedFor !== null) return;
    setVotedFor(idx);
    setVotes(
      votes.map((v, i) => (i === idx ? { ...v, count: v.count + 1 } : v))
    );
  };

  const handleComment = () => {
    if (!newComment.trim()) return;
    setComments([
      {
        id: Date.now(),
        author: "나",
        tier: "GOLD",
        content: newComment,
        time: "방금",
        likes: 0,
      },
      ...comments,
    ]);
    setNewComment("");
  };

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate("posts")}
        className="text-sm text-slate-400 hover:text-cyan-300 flex items-center gap-1"
      >
        ← 목록으로
      </button>

      {/* 영상 + 제목 */}
      <div className="bg-slate-900/40 neon-border rounded-2xl overflow-hidden animate-pulse-glow">
        <div
          className="aspect-video relative"
          style={{
            background: "linear-gradient(135deg, #1a2332 0%, #0a1628 100%)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center hover:scale-110 transition cursor-pointer">
              <Play
                className="w-8 h-8 text-cyan-300 ml-1"
                fill="currentColor"
              />
            </div>
          </div>
          {/* AI 추천 타임라인 */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300 tracking-widest">
                AI 추천 분쟁 구간
              </span>
            </div>
            <div className="flex gap-1">
              {[8, 14, 22].map((min, i) => (
                <div
                  key={i}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                >
                  {min}:00
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <span>{post.time}</span>
            <span>·</span>
            <span className="text-cyan-400">{post.tier}</span>
            <span>·</span>
            <span>조회 {post.views.toLocaleString()}</span>
          </div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white mb-2 leading-tight">
            {post.title}
          </h1>
          <p className="text-slate-400 leading-relaxed">{post.description}</p>
        </div>
      </div>

      {/* 투표 패널 */}
      <div className="bg-slate-900/60 neon-border rounded-2xl p-6">
        <h2 className="font-display font-bold text-xl text-cyan-300 neon-text mb-5 tracking-wide">
          ⚖️ 누가 더 잘못했나요?
        </h2>
        <div className="space-y-4">
          {votes.map((v, i) => {
            const pct = totalVotes ? (v.count / totalVotes) * 100 : 0;
            const isVoted = votedFor === i;
            const barColor =
              i === 0
                ? "linear-gradient(90deg, #00e5e5, #0088cc)"
                : i === 1
                ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                : "linear-gradient(90deg, #64748b, #475569)";
            return (
              <div key={i}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span
                    className={`font-bold ${
                      isVoted ? "text-cyan-300" : "text-slate-200"
                    }`}
                  >
                    {v.label} {isVoted && "✓"}
                  </span>
                  <span className="font-display font-bold text-sm">
                    <span className="text-slate-300">{v.count}표</span>
                    <span className="text-slate-500 ml-2">
                      ({pct.toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                <button
                  onClick={() => handleVote(i)}
                  disabled={votedFor !== null}
                  className={`w-full py-2 rounded-md text-sm font-bold tracking-wider transition ${
                    votedFor === null
                      ? "bg-slate-800/50 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40"
                      : isVoted
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                      : "bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed"
                  }`}
                >
                  {isVoted
                    ? "투표 완료"
                    : votedFor !== null
                    ? "-"
                    : "투표하기 (10 pt)"}
                </button>
              </div>
            );
          })}
        </div>

        {/* 추천/비추천/공유 */}
        <div className="flex items-center justify-center gap-6 pt-5 mt-5 border-t border-slate-800 text-sm text-slate-400">
          <button className="flex items-center gap-1.5 hover:text-cyan-300 transition">
            <ThumbsUp className="w-4 h-4" /> 추천 {post.likes}
          </button>
          <button className="flex items-center gap-1.5 hover:text-red-400 transition">
            <ThumbsDown className="w-4 h-4" /> 비추천 {post.dislikes}
          </button>
          <button className="flex items-center gap-1.5 hover:text-cyan-300 transition">
            <Share2 className="w-4 h-4" /> 공유
          </button>
        </div>
      </div>

      {/* 댓글 */}
      <div className="bg-slate-900/40 neon-border rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-cyan-400" />
          판관들의 의견{" "}
          <span className="text-cyan-400">{comments.length}</span>
        </h2>

        {/* 댓글 입력 */}
        <div className="flex gap-2 mb-6">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder="의견을 남겨보세요 (5 pt)"
            className="flex-1 bg-slate-950/50 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={handleComment}
            className="px-4 py-2.5 rounded-md text-sm font-bold text-slate-900"
            style={{
              background: "linear-gradient(135deg, #00e5e5, #0088cc)",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className="flex gap-3 pb-4 border-b border-slate-800/50 last:border-0"
            >
              <div
                className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm"
                style={{
                  background:
                    TIER_COLORS[c.tier] ||
                    "linear-gradient(135deg, #64748b, #475569)",
                }}
              >
                <span className="text-slate-900">{c.author[0]}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-slate-200">
                    {c.author}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: TIER_COLORS[c.tier] || "#475569",
                      color: "#0a0e1a",
                    }}
                  >
                    {c.tier}
                  </span>
                  <span className="text-xs text-slate-500">{c.time}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {c.content}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <button className="hover:text-cyan-300 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> {c.likes}
                  </button>
                  <button className="hover:text-cyan-300">답글</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

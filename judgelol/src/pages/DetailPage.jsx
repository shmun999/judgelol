import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ThumbsUp, ThumbsDown, MessageCircle, Send, Youtube, ArrowLeft, Trash2,
} from "lucide-react";
import { getPost, vote, createComment, likeComment, likePost, deleteComment } from "../api";
import { TIER_COLORS } from "../data/mockData";

export default function DetailPage({ isLoggedIn, userName, userEmail }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votedFor, setVotedFor] = useState(null);
  const [myLike, setMyLike] = useState(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    getPost(id, userEmail)
      .then((data) => {
        setPost(data);
        if (data.my_voted_option_id) setVotedFor(data.my_voted_option_id);
        if (data.my_like) setMyLike(data.my_like);
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id, userEmail]);

  const handleVote = async (option) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (votedFor !== null) return;
    setVotedFor(option.id);
    await vote(id, option.id, userEmail);
    // 투표 수 로컬 업데이트
    setPost((prev) => ({
      ...prev,
      votes: prev.votes.map((v) =>
        v.id === option.id ? { ...v, count: v.count + 1 } : v
      ),
    }));
  };

  const handleComment = async () => {
    if (!isLoggedIn) { navigate("/login"); return; }
    if (!newComment.trim()) return;
    await createComment(id, { content: newComment, author: userName, author_email: userEmail });
    setPost((prev) => ({
      ...prev,
      comments: [
        { id: Date.now(), author: userName, author_email: userEmail, tier: "UNRANKED", content: newComment, created_at: new Date().toISOString(), likes: 0 },
        ...(prev.comments || []),
      ],
    }));
    setNewComment("");
  };

  const handleLikePost = async (type) => {
    if (!isLoggedIn) { navigate("/login"); return; }
    const result = await likePost(id, type, userEmail);
    setPost((prev) => ({ ...prev, likes: result.likes, dislikes: result.dislikes }));
    setMyLike((prev) => prev === type ? null : type);
  };

  const handleLikeComment = async (commentId) => {
    if (!isLoggedIn) { navigate("/login"); return; }
    const result = await likeComment(commentId, userEmail);
    setPost((prev) => ({
      ...prev,
      comments: prev.comments.map((c) =>
        c.id === commentId ? { ...c, likes: result.likes } : c
      ),
    }));
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    await deleteComment(commentId, userEmail);
    setPost((prev) => ({
      ...prev,
      comments: prev.comments.filter((c) => c.id !== commentId),
    }));
  };

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;
  if (!post) return <div className="text-center py-20 text-slate-400">게시글을 찾을 수 없습니다.</div>;

  const totalVotes = (post.votes || []).reduce((a, b) => a + b.count, 0);
  const barColors = [
    "linear-gradient(90deg, #3b82f6, #06b6d4)",
    "linear-gradient(90deg, #f59e0b, #ef4444)",
    "linear-gradient(90deg, #8b5cf6, #ec4899)",
    "linear-gradient(90deg, #10b981, #06b6d4)",
  ];

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return "방금";
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-semibold transition"
      >
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </button>

      {/* 제목 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: TIER_COLORS[post.tier] || "#64748b" }}
          >
            {post.tier}
          </span>
          <span className="text-xs text-slate-400">{timeAgo(post.created_at)}</span>

        </div>
        <h1 className="font-bold text-xl text-slate-800 mb-2 leading-snug">{post.title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{post.description}</p>
      </div>

      {/* 영상 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="aspect-video relative flex items-center justify-center" style={{ background: "#0f172a" }}>
          {post.youtube_url ? (
            <iframe
              className="w-full h-full"
              src={post.youtube_url.replace("watch?v=", "embed/")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="text-center">
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">등록된 영상이 없습니다</p>
            </div>
          )}

        </div>
      </div>

      {/* 투표 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
          ⚖️ 누가 더 잘못했나요?
          <span className="text-xs text-slate-400 font-normal ml-1">총 {totalVotes}표</span>
        </h2>
        <div className="space-y-4">
          {(post.votes || []).map((v, i) => {
            const pct = totalVotes ? (v.count / totalVotes) * 100 : 0;
            const isVoted = votedFor === v.id;
            return (
              <div key={v.id}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className={`text-sm font-bold ${isVoted ? "text-blue-600" : "text-slate-700"}`}>
                    {v.label} {isVoted && "✓"}
                  </span>
                  <span className="text-sm text-slate-500">{v.count}표 ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColors[i % barColors.length] }} />
                </div>
                <button
                  onClick={() => handleVote(v)}
                  disabled={votedFor !== null}
                  className={`w-full py-2 rounded-lg text-sm font-bold transition border ${
                    votedFor === null
                      ? "border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                      : isVoted
                      ? "border-blue-400 text-blue-600 bg-blue-50"
                      : "border-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  {isVoted ? "✓ 투표 완료" : votedFor !== null ? "—" : !isLoggedIn ? "🔒 로그인 후 투표 가능" : "투표하기"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 pt-4 mt-4 border-t border-slate-100 text-sm text-slate-500">
          <button
            onClick={() => handleLikePost("like")}
            className={`flex items-center gap-1.5 transition font-semibold ${myLike === "like" ? "text-blue-500" : "hover:text-blue-500"}`}
          >
            <ThumbsUp className="w-4 h-4" /> 추천 {post.likes}
          </button>
          <button
            onClick={() => handleLikePost("dislike")}
            className={`flex items-center gap-1.5 transition font-semibold ${myLike === "dislike" ? "text-red-400" : "hover:text-red-400"}`}
          >
            <ThumbsDown className="w-4 h-4" /> 비추천 {post.dislikes}
          </button>
        </div>
      </div>

      {/* 댓글 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-500" />
          판관들의 의견 <span className="text-blue-500">{(post.comments || []).length}</span>
        </h2>
        {isLoggedIn ? (
          <div className="flex gap-2 mb-6">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="의견을 남겨보세요"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition"
            />
            <button
              onClick={handleComment}
              className="px-4 py-2.5 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className="mb-6 p-4 rounded-lg border border-slate-200 bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition"
            onClick={() => navigate("/login")}
          >
            <p className="text-sm text-slate-400">
              🔒 <span className="text-blue-500 font-semibold">로그인</span>하면 댓글을 작성할 수 있어요
            </p>
          </div>
        )}
        <div className="space-y-4">
          {(post.comments || []).map((c) => (
            <div key={c.id} className="flex gap-3 pb-4 border-b border-slate-100 last:border-0">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white"
                style={{ background: TIER_COLORS[c.tier] || "#64748b" }}
              >
                {c.author[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-slate-700">{c.author}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: TIER_COLORS[c.tier] || "#64748b" }}>
                    {c.tier}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{c.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <button
                    onClick={() => handleLikeComment(c.id)}
                    className="hover:text-blue-500 flex items-center gap-1 transition"
                  >
                    <ThumbsUp className="w-3 h-3" /> {c.likes}
                  </button>
                  {c.author_email === userEmail && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="hover:text-red-400 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" /> 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

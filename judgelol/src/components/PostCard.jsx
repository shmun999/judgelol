import { MessageCircle, ThumbsUp, ThumbsDown, Clock, Flame } from "lucide-react";
import { TIER_COLORS } from "../data/mockData";

export default function PostCard({ post, onClick, isAdmin }) {
  const votes = post.votes || [];
  const topVote = votes.length > 0 ? Math.max(...votes.map((v) => v.count)) : 0;
  const totalVotes = votes.reduce((a, b) => a + b.count, 0);

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return "방금";
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 group border border-slate-200 hover:border-slate-300"
    >
      {/* 상단 태그 + 제목 */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: TIER_COLORS[post.tier] || "#64748b" }}
          >
            {post.tier}
          </span>
          {post.likes > 10 && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-orange-500">
              <Flame className="w-3 h-3" /> HOT
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(post.created_at)}
          </span>
        </div>
        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {post.title}
        </h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{post.description}</p>
      </div>

      {/* 투표 현황 */}
      <div className="px-4 pb-3 space-y-1.5">
        {votes.map((v, i) => {
          const showStats = isAdmin || post.is_closed;
          const pct = totalVotes && showStats ? Math.round((v.count / totalVotes) * 100) : 0;
          const isTop = showStats && v.count === topVote && topVote > 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-xs w-20 truncate shrink-0 ${isTop ? "font-bold text-blue-600" : "text-slate-400"}`}>
                {v.label}
              </span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: showStats ? `${pct}%` : "0%",
                    background: isTop ? "linear-gradient(90deg, #3b82f6, #06b6d4)" : "#cbd5e1",
                  }}
                />
              </div>
              <span className={`text-xs w-8 text-right shrink-0 ${isTop ? "font-bold text-blue-600" : "text-slate-400"}`}>
                {showStats ? `${pct}%` : "-"}
              </span>
            </div>
          );
        })}
      </div>

      {/* 하단 통계 - 조회수 제거, 추천/비추천/댓글 */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 bg-slate-50">
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3" />
          {post.likes ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <ThumbsDown className="w-3 h-3" />
          {post.dislikes ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          {post.comment_count ?? 0}
        </span>
        <span className="ml-auto font-semibold text-slate-500">
          {(isAdmin || post.is_closed) ? `총 ${totalVotes}표` : `총 -표`}
        </span>
      </div>
    </button>
  );
}

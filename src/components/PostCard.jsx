import { Play, Eye, MessageCircle, ThumbsUp, Clock } from "lucide-react";

export default function PostCard({ post, onClick }) {
  const topVote = Math.max(...post.votes.map((v) => v.count));
  const totalVotes = post.votes.reduce((a, b) => a + b.count, 0);

  return (
    <button
      onClick={onClick}
      className="text-left bg-slate-900/60 neon-border rounded-xl overflow-hidden hover:bg-slate-900/90 transition group"
    >
      {/* 영상 썸네일 */}
      <div
        className="aspect-video relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a2332 0%, #0a1628 100%)",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
            <Play
              className="w-6 h-6 text-cyan-300 ml-0.5"
              fill="currentColor"
            />
          </div>
        </div>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-cyan-300 border border-cyan-500/30">
          {post.tier}
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-slate-300">
          <Clock className="w-3 h-3" />
          {post.time}
        </div>
      </div>

      {/* 카드 내용 */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-cyan-300 transition">
          {post.title}
        </h3>

        {/* 투표 현황 바 */}
        <div className="space-y-1.5">
          {post.votes.map((v, i) => {
            const pct = totalVotes ? (v.count / totalVotes) * 100 : 0;
            const isTop = v.count === topVote;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span
                    className={
                      isTop ? "text-cyan-300 font-bold" : "text-slate-400"
                    }
                  >
                    {v.label}
                  </span>
                  <span
                    className={
                      isTop ? "text-cyan-300 font-bold" : "text-slate-400"
                    }
                  >
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: isTop
                        ? "linear-gradient(90deg, #00e5e5, #0088cc)"
                        : "#475569",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 통계 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {post.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {post.comments}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            {post.likes}
          </span>
        </div>
      </div>
    </button>
  );
}

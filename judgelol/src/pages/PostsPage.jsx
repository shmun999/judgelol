import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { getPosts } from "../api";
import { PenSquare, Flame, Clock, CheckCircle, List } from "lucide-react";

const PAGE_SIZE = 15;

export default function PostsPage({ isAdmin }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  // 필터 변경 시 페이지 초기화
  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(0);
  };

  const filters = [
    { key: "all", label: "전체", icon: List },
    { key: "hot", label: "HOT", icon: Flame },
    { key: "new", label: "최신", icon: Clock },
    { key: "judged", label: "판정완료", icon: CheckCircle },
  ];

  const filteredPosts = (() => {
    switch (filter) {
      case "hot":
        return [...posts]
          .filter(p => (p.likes || 0) >= 5)
          .sort((a, b) => b.likes - a.likes);
      case "new":
        return [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case "judged":
        return [...posts].filter(p => p.is_closed);
      default:
        return [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  })();

  const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
  const pagedPosts = filteredPosts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-800 tracking-wide">
            판정 법정
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">판관들의 투표로 결정되는 과실 비율</p>
        </div>
        <button
          onClick={() => navigate("/write")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
        >
          <PenSquare className="w-4 h-4" />
          새 판정 요청
        </button>
      </div>

      <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 border border-slate-200 w-fit">
        {filters.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === f.key
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">불러오는 중...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          {filter === "hot" ? "좋아요 5개 이상 받은 글이 없어요." :
           filter === "judged" ? "판정 완료된 글이 없어요." :
           "아직 게시글이 없어요. 첫 판정을 요청해보세요!"}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedPosts.map((post) => (
              <PostCard
                isAdmin={isAdmin}
                key={post.id}
                post={post}
                onClick={() => navigate(`/board/${post.id}`)}
              />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
              >
                ＜
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
                    page === i
                      ? "bg-blue-500 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
              >
                ＞
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

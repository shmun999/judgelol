import { useState } from "react";
import PostCard from "../components/PostCard";
import { MOCK_POSTS } from "../data/mockData";

export default function PostsPage({ navigate }) {
  const [filter, setFilter] = useState("all");

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">
            판정 법정
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            판관들의 투표로 결정되는 과실 비율
          </p>
        </div>
        <button
          onClick={() => navigate("login")}
          className="px-5 py-2.5 rounded-md font-bold text-sm text-slate-900"
          style={{
            background: "linear-gradient(135deg, #00e5e5, #0088cc)",
            boxShadow: "0 0 20px rgba(0, 229, 229, 0.3)",
          }}
        >
          + 새 판정 요청
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: "all", label: "전체" },
          { key: "hot", label: "🔥 HOT" },
          { key: "new", label: "최신" },
          { key: "judged", label: "판정완료" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${
              filter === f.key
                ? "bg-cyan-500/20 text-cyan-300 neon-border"
                : "bg-slate-900/40 text-slate-400 border border-slate-800 hover:border-cyan-500/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 게시글 목록 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MOCK_POSTS.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={() => navigate("detail", post.id)}
          />
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Gavel, User, Trophy, ChevronRight } from "lucide-react";
import PostCard from "../components/PostCard";
import { getPosts } from "../api";

export default function HomePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const hotPosts = [...posts].sort((a, b) => b.views - a.views).slice(0, 3);
  const newPosts = [...posts].slice(0, 3);

  return (
    <div className="space-y-10">
      {/* 히어로 섹션 */}
      <section
        className="relative py-14 rounded-2xl overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/30 bg-white/10 mb-5">
            <Sparkles className="w-3 h-3 text-cyan-200" />
            <span className="text-xs text-cyan-100 font-semibold tracking-wider">
              AI 기반 분쟁 판정 플랫폼
            </span>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl mb-4 tracking-tight leading-tight">
            누가 더 잘못했나요?
          </h1>
          <p className="text-white/80 text-base mb-8 leading-relaxed">
            게임 내 분쟁, 이제 법정으로.<br />
            <span className="text-cyan-200 font-semibold">AI가 핵심 구간을 찾고</span>{" "}
            <span className="text-cyan-200 font-semibold">전문가가 판정</span>합니다.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/board")}
              className="px-6 py-2.5 rounded-lg font-bold text-sm bg-white text-blue-600 hover:bg-blue-50 transition shadow"
            >
              판정 보러가기
            </button>
            <button
              onClick={() => navigate("/write")}
              className="px-6 py-2.5 rounded-lg font-bold text-sm border border-white/40 text-white hover:bg-white/10 transition"
            >
              글 올리기
            </button>
          </div>
        </div>
      </section>



      {/* HOT 판정 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-blue-500" />
            <h2 className="font-bold text-lg text-slate-800">🔥 HOT 판정</h2>
          </div>
          <button
            onClick={() => navigate("/board")}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-semibold"
          >
            전체보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-slate-400">불러오는 중...</div>
        ) : hotPosts.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            아직 게시글이 없어요.{" "}
            <button onClick={() => navigate("/write")} className="text-blue-500 font-semibold">첫 판정을 요청해보세요!</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {hotPosts.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/board/${post.id}`)} />
            ))}
          </div>
        )}
      </section>

      {/* 최신 판정 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-cyan-500" />
            <h2 className="font-bold text-lg text-slate-800">🆕 최신 판정</h2>
          </div>
          <button
            onClick={() => navigate("/board")}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-semibold"
          >
            전체보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-slate-400">불러오는 중...</div>
        ) : newPosts.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            아직 게시글이 없어요.{" "}
            <button onClick={() => navigate("/write")} className="text-blue-500 font-semibold">첫 판정을 요청해보세요!</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {newPosts.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/board/${post.id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { Sparkles, Gavel, User, Trophy, Flame, ChevronRight } from "lucide-react";
import PostCard from "../components/PostCard";
import { MOCK_POSTS } from "../data/mockData";

export default function HomePage({ navigate }) {
  return (
    <div className="space-y-16">
      {/* 히어로 섹션 */}
      <section className="relative py-16 grid-bg rounded-2xl overflow-hidden neon-border">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, rgba(0,229,229,0.15), transparent 50%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 mb-6">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-cyan-300 font-semibold tracking-wider">
              AI 기반 분쟁 판정 플랫폼
            </span>
          </div>
          <h1
            className="font-display font-black text-5xl md:text-6xl mb-4 tracking-tighter"
            style={{
              background:
                "linear-gradient(180deg, #ffffff 0%, #00e5e5 50%, #0088cc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            누가 더 잘못했나요?
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            게임 내 분쟁, 이제 법정으로.
            <br />
            <span className="text-cyan-300 font-semibold">
              AI가 핵심 구간을 찾고
            </span>{" "}
            <span className="text-cyan-300 font-semibold">전문가가 판정</span>
            합니다.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("posts")}
              className="px-6 py-3 rounded-md font-bold tracking-wider text-sm text-slate-900 hover:scale-105 transition"
              style={{
                background:
                  "linear-gradient(135deg, #00e5e5 0%, #00b8b8 100%)",
                boxShadow: "0 0 30px rgba(0, 229, 229, 0.4)",
              }}
            >
              판정 보러가기
            </button>
            <button
              onClick={() => navigate("login")}
              className="px-6 py-3 rounded-md font-bold tracking-wider text-sm neon-border text-cyan-300 hover:bg-cyan-500/10 transition"
            >
              글 올리기
            </button>
          </div>
        </div>
      </section>

      {/* 통계 */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { label: "총 판정 수", value: "2,847", icon: Gavel },
          { label: "활성 판관", value: "1,203", icon: User },
          { label: "오늘 투표", value: "8,921", icon: Trophy },
        ].map((stat, i) => (
          <div
            key={i}
            className="relative bg-slate-900/40 neon-border rounded-xl p-6 scan-line overflow-hidden"
          >
            <stat.icon className="w-5 h-5 text-cyan-400 mb-3" />
            <div className="font-display font-black text-3xl text-cyan-300 neon-text">
              {stat.value}
            </div>
            <div className="text-xs text-slate-400 tracking-widest mt-1">
              {stat.label.toUpperCase()}
            </div>
          </div>
        ))}
      </section>

      {/* HOT 판정 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6 text-orange-400" />
            <h2 className="font-display font-bold text-2xl text-white tracking-wide">
              HOT 판정
            </h2>
          </div>
          <button
            onClick={() => navigate("posts")}
            className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
          >
            전체보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {MOCK_POSTS.slice(0, 3).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => navigate("detail", post.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

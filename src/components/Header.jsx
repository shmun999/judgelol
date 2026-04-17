import { Gavel } from "lucide-react";

export default function Header({ page, navigate, isLoggedIn, userName, userTier }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* 로고 */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("home")}
        >
          <div className="relative">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #00e5e5 0%, #0088cc 100%)",
              }}
            >
              <Gavel className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 rounded-lg bg-cyan-400/30 blur-md -z-10 group-hover:bg-cyan-400/50 transition" />
          </div>
          <div>
            <div className="font-display font-black text-xl text-cyan-300 neon-text tracking-wider">
              몇대몇
            </div>
            <div className="text-[10px] text-cyan-500/60 -mt-1 tracking-widest">
              JUDGE LOL
            </div>
          </div>
        </div>

        {/* 내비게이션 */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { key: "home", label: "HOME" },
            { key: "posts", label: "법정", activeAlso: ["detail"] },
            { key: "ranking", label: "랭킹" },
            { key: "shop", label: "상점" },
          ].map((item) => {
            const isActive =
              page === item.key ||
              (item.activeAlso && item.activeAlso.includes(page));
            return (
              <button
                key={item.key}
                onClick={() =>
                  item.key === "ranking" || item.key === "shop"
                    ? null
                    : navigate(item.key)
                }
                className={`text-sm font-semibold tracking-wide transition ${
                  isActive
                    ? "text-cyan-300 neon-text"
                    : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 유저 영역 */}
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/50 border border-slate-700">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, #00e5e5, #0088cc)",
                }}
              >
                <span className="text-slate-900">
                  {userName[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-200">
                {userName}
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">
                {userTier}
              </span>
            </div>
          ) : (
            <button
              onClick={() => navigate("login")}
              className="px-4 py-1.5 rounded-md neon-border text-cyan-300 text-sm font-bold hover:bg-cyan-500/10 transition"
            >
              LOGIN
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

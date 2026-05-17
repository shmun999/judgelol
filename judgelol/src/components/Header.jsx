import { Gavel } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Header({ isLoggedIn, userName, userPicture }) {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { to: "/", label: "홈" },
    { to: "/board", label: "법정" },
    { to: "/shop", label: "상점" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)" }}
          >
            <Gavel className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="font-display font-black text-xl text-slate-800 tracking-widest">
            JUDGELOL
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? path === "/"
                : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              to="/setting"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
            >
              {userPicture ? (
                <img src={userPicture} className="w-6 h-6 rounded-full" alt="프로필" />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
                >
                  {userName[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-slate-700">{userName}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-lg text-white text-sm font-bold transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

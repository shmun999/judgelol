import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";

export default function SettingPage({ userName, userEmail, userPicture, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  return (
    <div className="max-w-lg mx-auto py-10 space-y-4">
      <h1 className="font-bold text-xl text-slate-800 mb-6">설정</h1>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4">
        {userPicture ? (
          <img src={userPicture} className="w-14 h-14 rounded-full" alt="프로필" />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            {userName?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-bold text-slate-800">{userName}</div>
          <div className="text-sm text-slate-400">{userEmail}</div>
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-6 py-4 text-red-500 hover:bg-red-50 transition text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}

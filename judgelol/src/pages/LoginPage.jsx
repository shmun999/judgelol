import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { Gavel } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // 구글에서 사용자 정보 가져오기
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await res.json();
      onLogin(userInfo.name, userInfo.email, userInfo.picture);
      navigate("/");
    },
    onError: () => {
      alert("구글 로그인에 실패했습니다. 다시 시도해주세요.");
    },
  });

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
        >
          <Gavel className="w-7 h-7 text-white" strokeWidth={2} />
        </div>
        <h1 className="font-display font-black text-2xl text-slate-800 tracking-wide mb-1">
          로그인
        </h1>
        <p className="text-slate-400 text-sm">법정에 입장하세요</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <button
          onClick={() => googleLogin()}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition font-semibold text-slate-700 text-sm shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google 계정으로 로그인하기
        </button>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 leading-relaxed">
            로그인 시{" "}
            <span className="text-blue-500 cursor-pointer hover:underline">이용약관</span>
            {" "}및{" "}
            <span className="text-blue-500 cursor-pointer hover:underline">개인정보처리방침</span>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs text-blue-600 leading-relaxed text-center">
          🔒 JUDGELOL은 Google 계정 정보를 저장하지 않으며,<br />
          로그인 인증에만 사용됩니다.
        </p>
      </div>
    </div>
  );
}

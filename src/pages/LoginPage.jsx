import { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [riotId, setRiotId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = () => {
    if (!riotId || !email || !password) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    setVerifying(true);
    // TODO: 실제 Riot API 연동 시 여기를 교체
    setTimeout(() => {
      const tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      onLogin(riotId.split("#")[0], tier);
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        <h1
          className="font-display font-black text-4xl mb-2 tracking-wider"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #00e5e5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {mode === "login" ? "LOG IN" : "SIGN UP"}
        </h1>
        <p className="text-slate-400 text-sm">
          {mode === "login"
            ? "법정에 입장하세요"
            : "판관이 되어 판정에 참여하세요"}
        </p>
      </div>

      <div className="bg-slate-900/60 neon-border rounded-2xl p-8 space-y-5">
        <div>
          <label className="block text-xs text-cyan-400 font-bold tracking-widest mb-2">
            RIOT ID
          </label>
          <input
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder="이름#KR1"
            className="w-full bg-slate-950/50 border border-slate-700 rounded-md px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            * Riot 계정 연동 시 자동으로 티어가 표시됩니다
          </p>
        </div>
        <div>
          <label className="block text-xs text-cyan-400 font-bold tracking-widest mb-2">
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-slate-950/50 border border-slate-700 rounded-md px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-cyan-400 font-bold tracking-widest mb-2">
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-950/50 border border-slate-700 rounded-md px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={verifying}
          className="w-full py-3 rounded-md font-bold tracking-widest text-sm text-slate-900 transition hover:scale-[1.02] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #00e5e5 0%, #0088cc 100%)",
            boxShadow: "0 0 30px rgba(0, 229, 229, 0.4)",
          }}
        >
          {verifying
            ? "RIOT API 티어 조회 중..."
            : mode === "login"
            ? "LOGIN"
            : "SIGN UP"}
        </button>

        <div className="text-center text-sm text-slate-500">
          {mode === "login"
            ? "계정이 없으신가요?"
            : "이미 계정이 있으신가요?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-cyan-400 font-semibold hover:text-cyan-300"
          >
            {mode === "login" ? "회원가입" : "로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}

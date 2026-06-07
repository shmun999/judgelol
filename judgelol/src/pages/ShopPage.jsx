import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit, Search, Check, ChevronDown, ChevronUp,
  ArrowLeft, Trash2, Trophy, Clock, ThumbsUp
} from "lucide-react";
import { getSummonerGames, saveAnalysis, getAnalyses, getAnalysis, deleteAnalysis } from "../api";

const BASE_URL = "https://judgelol.com/api";

// ── WinProbChart (DetailPage와 동일) ─────────────────────────────
function WinProbChart({ data, keyEvents, keyMoments }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length === 0) return null;
  const W = 620, H = 220;
  const pl = 46, pr = 20, pt = 26, pb = 36;
  const cw = W - pl - pr, ch = H - pt - pb;
  const maxMin = data[data.length - 1].minute;
  const x = (m) => pl + (m / maxMin) * cw;
  const y = (p) => pt + (1 - p / 100) * ch;
  const points = data.map((d) => `${x(d.minute)},${y(d.prob)}`).join(" ");
  const areaPath =
    `M ${x(data[0].minute)},${y(50)} ` +
    data.map((d) => `L ${x(d.minute)},${y(d.prob)}`).join(" ") +
    ` L ${x(maxMin)},${y(50)} Z`;
  const tickInterval = maxMin <= 25 ? 5 : 10;
  const ticks = [];
  for (let m = 0; m <= maxMin; m += tickInterval) ticks.push(m);
  if (ticks[ticks.length - 1] !== maxMin) ticks.push(maxMin);
  const lastProb = data[data.length - 1].prob;
  const eventsByMinute = {};
  (keyEvents || []).forEach((e) => {
    if (!eventsByMinute[e.minute]) eventsByMinute[e.minute] = [];
    eventsByMinute[e.minute].push(e);
  });

  return (
    <div className="relative space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg"
        style={{ background: "#0f172a" }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="winAreaGradShop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((p) => (
          <g key={p}>
            <line x1={pl} y1={y(p)} x2={pl + cw} y2={y(p)}
              stroke={p === 50 ? "#334155" : "#1e293b"}
              strokeWidth={p === 50 ? 1.5 : 1}
              strokeDasharray={p === 50 ? "5,4" : undefined}
            />
            <text x={pl - 5} y={y(p) + 4} textAnchor="end" fontSize="10" fill="#475569">{p}%</text>
          </g>
        ))}
        {(keyMoments || []).map((km, i) => (
          <g key={i}>
            <rect x={x(Math.max(0, km.minute - 2))} y={pt}
              width={x(km.minute + 2) - x(km.minute - 2)} height={ch}
              fill={km.isPositive ? "#22c55e" : "#ef4444"} opacity="0.07"
            />
            <line x1={x(km.minute)} y1={pt - 4} x2={x(km.minute)} y2={pt + ch}
              stroke={km.isPositive ? "#22c55e" : "#ef4444"} strokeWidth="2"
            />
            <rect x={Math.min(x(km.minute) - 28, W - 62)} y={pt - 19}
              width="56" height="16" rx="3"
              fill={km.isPositive ? "#22c55e" : "#ef4444"}
            />
            <text x={Math.min(x(km.minute), W - 34)} y={pt - 7}
              textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">
              {km.minute}분 {km.isPositive ? "▲" : "▼"}
            </text>
            <circle cx={x(km.minute)} cy={y(km.prob)} r="5"
              fill={km.isPositive ? "#22c55e" : "#ef4444"}
              stroke="#0f172a" strokeWidth="1.5"
            />
          </g>
        ))}
        <path d={areaPath} fill="url(#winAreaGradShop)" />
        <polyline points={points} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d) => {
          const cx = x(d.minute), cy = y(d.prob);
          const eventsHere = eventsByMinute[d.minute] || [];
          const isHovered = tooltip?.minute === d.minute;
          return (
            <circle key={d.minute} cx={cx} cy={cy}
              r={isHovered ? 5 : 4}
              fill={isHovered ? "#ffffff" : "transparent"}
              stroke={isHovered ? "#60a5fa" : "transparent"}
              strokeWidth="1.5"
              style={{ cursor: eventsHere.length > 0 ? "pointer" : "default" }}
              onMouseEnter={() => setTooltip({ minute: d.minute, prob: d.prob, cx, cy, events: eventsHere })}
            />
          );
        })}
        <circle cx={x(data[0].minute)} cy={y(data[0].prob)} r="3" fill="#60a5fa" />
        <circle cx={x(maxMin)} cy={y(lastProb)} r="5"
          fill={lastProb >= 50 ? "#22c55e" : "#f87171"} />
        <text x={Math.min(x(maxMin) + 8, W - 28)} y={y(lastProb) + 4}
          fontSize="11" fill={lastProb >= 50 ? "#22c55e" : "#f87171"} fontWeight="bold">
          {lastProb}%
        </text>
        {ticks.map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={pt + ch} x2={x(m)} y2={pt + ch + 4} stroke="#334155" />
            <text x={x(m)} y={pt + ch + 16} textAnchor="middle" fontSize="10" fill="#475569">{m}분</text>
          </g>
        ))}
        <text x={pl + 4} y={pt + 13} fontSize="9" fill="#60a5fa" fontWeight="bold">승리 확률</text>
        <text x={W / 2} y={H - 3} textAnchor="middle" fontSize="9" fill="#334155">
          AI 모델 예측 (시연용 모의 데이터)
        </text>
      </svg>
      {tooltip && (
        <div className="absolute z-50 pointer-events-none"
          style={{
            left: `calc(${(tooltip.cx / W) * 100}% - 80px)`,
            top: `calc(${(tooltip.cy / H) * 100}% - 8px)`,
            transform: "translateY(-100%)",
          }}
        >
          <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-xl p-2.5 min-w-[160px] max-w-[220px]">
            <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-700">
              <span className="text-xs font-bold text-white">{tooltip.minute}분</span>
              <span className="text-xs font-bold text-blue-400">{tooltip.prob}%</span>
            </div>
            {tooltip.events.length === 0 ? (
              <p className="text-xs text-slate-400">이벤트 없음</p>
            ) : (
              <ul className="space-y-1">
                {tooltip.events.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: e.isBlue ? "#3b82f6" : "#ef4444" }} />
                    <span className="text-slate-300 leading-tight">
                      {e.label}{e.showTeam ? ` (${e.isBlue ? "블루" : "레드"})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KeyMomentsPanel ───────────────────────────────────────────────
function KeyMomentsPanel({ keyMoments }) {
  if (!keyMoments || keyMoments.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
        🎯 주요 관전 포인트
        <span className="text-xs font-normal text-slate-400">AI가 감지한 승률 변동 구간입니다</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {keyMoments.map((km, i) => (
          <div key={i} className={`rounded-lg p-3 border ${km.isPositive ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-600">{km.minute}분</span>
              <span className={`text-xs font-bold ${km.isPositive ? "text-green-600" : "text-red-500"}`}>
                {km.change > 0 ? "+" : ""}{Math.round(km.change)}%
              </span>
            </div>
            <div className={`text-sm font-bold ${km.isPositive ? "text-green-700" : "text-red-600"}`}>{km.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">승률 → <span className="font-semibold">{km.prob}%</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 분석 상세 뷰 ──────────────────────────────────────────────────
function AnalysisDetailView({ analysisId, userEmail, onBack, onDelete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getAnalysis(analysisId, userEmail)
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [analysisId]);

  if (loading) return <div className="py-20 text-center text-slate-400">불러오는 중...</div>;
  if (!data || data.error) return <div className="py-20 text-center text-slate-400">분석 결과를 불러올 수 없습니다.</div>;

  const g = data.gameData || {};
  const csPerMin = g.cs && g.duration ? (g.cs / (g.duration / 60)).toFixed(1) : "-";
  const dmgK = g.damageDealt ? (g.damageDealt / 1000).toFixed(1) : "-";

  const handleDelete = async () => {
    if (!confirm("이 분석 기록을 삭제하시겠습니까?")) return;
    setDeleting(true);
    await deleteAnalysis(analysisId, userEmail);
    onDelete();
  };

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> 목록으로
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> 삭제
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-700 text-sm">게임 데이터 분석</h2>
          <span className="text-xs text-slate-400">AI 모델 기반 · {timeAgo(data.created_at)}</span>
        </div>

        <div className="p-5 space-y-5">
          {/* 소환사 정보 */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg font-bold text-slate-800">{g.summonerName}</span>
              <span className="text-sm text-slate-400 font-mono">#{g.tagLine}</span>
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className={`font-bold px-2.5 py-0.5 rounded text-white text-xs ${g.win ? "bg-blue-500" : "bg-red-400"}`}>
                {g.win ? "승리" : "패배"}
              </span>
              <span className="font-bold text-slate-700">{g.champion}</span>
              <span className="text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{g.positionKr}</span>
              <span className="text-slate-400 text-xs">게임시간 {g.durationStr}</span>
            </div>
          </div>

          {/* 스탯 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "KDA", value: `${g.kills} / ${g.deaths} / ${g.assists}`, sub: `평점 ${g.kda}`,
                valueColor: parseFloat(g.kda) >= 4 ? "text-blue-600" : parseFloat(g.kda) >= 2 ? "text-slate-800" : "text-red-500" },
              { label: "CS", value: g.cs, sub: `${csPerMin}/분` },
              { label: "시야 점수", value: g.visionScore },
              { label: "챔피언 딜량", value: `${dmgK}k` },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                <div className={`font-bold text-base ${s.valueColor || "text-slate-800"}`}>{s.value}</div>
                {s.sub && <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* 주요 관전 포인트 */}
          <KeyMomentsPanel keyMoments={g.keyMoments} />

          {/* 승률 그래프 */}
          {g.winProbability?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2.5">시간대별 승리 확률 변화</h3>
              <WinProbChart data={g.winProbability} keyEvents={g.keyEvents} keyMoments={g.keyMoments} />
            </div>
          )}

          {/* 팀 구성 */}
          {g.blueTeam && g.redTeam && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2.5">팀 구성</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-blue-500 mb-1.5">🔵 블루팀</div>
                  <div className="space-y-1">
                    {g.blueTeam.map((p, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-xs rounded px-2.5 py-1.5 ${p.isPlayer ? "bg-blue-50 border border-blue-200 font-semibold" : "bg-slate-50"}`}>
                        {p.isPlayer && <span className="text-blue-500">★</span>}
                        <span className="text-slate-700">{p.champion}</span>
                        <span className="text-slate-400 text-[10px]">{p.role}</span>
                        {p.isPlayer && (
                          <span className="ml-auto text-blue-500 text-[10px] font-bold">
                            {g.summonerName}#{g.tagLine}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-red-400 mb-1.5">🔴 레드팀</div>
                  <div className="space-y-1">
                    {g.redTeam.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-50 rounded px-2.5 py-1.5">
                        <span className="text-slate-700">{p.champion}</span>
                        <span className="text-slate-400 text-[10px]">{p.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI 분석하기 모달 (경기 선택 + 저장) ──────────────────────────
function AnalyzeModal({ userEmail, points, onClose, onSaved }) {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [loadingGames, setLoadingGames] = useState(false);
  const [games, setGames] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoadGames = async () => {
    if (!gameName || !tagLine) { setErrorMsg("소환사 이름과 태그를 모두 입력해주세요."); return; }
    setErrorMsg("");
    setLoadingGames(true);
    setGames(null);
    setSelectedGame(null);
    try {
      const data = await getSummonerGames(gameName, tagLine);
      if (data.error) { setErrorMsg(data.error); return; }
      setGames(data.games);
    } catch {
      setErrorMsg("게임 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingGames(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedGame) { setErrorMsg("분석할 경기를 선택해주세요."); return; }
    if (points < 30) { setErrorMsg("포인트가 부족합니다. (30포인트 필요)"); return; }
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await saveAnalysis(userEmail, selectedGame);
      if (res.error) {
        // 이미 분석된 경기면 해당 id로 이동
        if (res.id) { onSaved(res.id); return; }
        setErrorMsg(res.error);
        return;
      }
      onSaved(res.id, res.points);
    } catch {
      setErrorMsg("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-slate-800">내 경기 AI 분석하기</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-200">
              🪙 {points.toLocaleString()}P 보유
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* 포인트 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <BrainCircuit className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-800 text-sm">AI 분석 비용: 30포인트</div>
              <div className="text-xs text-blue-600 mt-0.5">분석 결과는 나만 볼 수 있으며, 언제든 다시 확인할 수 있습니다.</div>
            </div>
          </div>

          {/* 소환사 검색 */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">소환사 검색</label>
            <div className="flex gap-2">
              <input
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadGames()}
                placeholder="소환사 이름  예) Hide on bush"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition"
              />
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 text-slate-400 text-sm font-bold">#</div>
              <input
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadGames()}
                placeholder="KR1"
                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition"
              />
              <button
                onClick={handleLoadGames}
                disabled={loadingGames}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-bold text-sm text-white disabled:opacity-60 transition hover:opacity-90 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
              >
                <Search className="w-3.5 h-3.5" />
                {loadingGames ? "불러오는 중..." : "불러오기"}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* 게임 목록 */}
          {games && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                최근 경기 목록 — 분석할 경기를 클릭하세요
              </p>
              {games.map((game) => {
                const isSelected = selectedGame?.gameId === game.gameId;
                return (
                  <button
                    key={game.gameId}
                    onClick={() => setSelectedGame(isSelected ? null : game)}
                    className={`w-full text-left rounded-lg border p-3 transition ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded text-white flex-shrink-0 ${game.win ? "bg-blue-500" : "bg-red-400"}`}>
                          {game.win ? "승리" : "패배"}
                        </span>
                        <span className="font-bold text-sm text-slate-800">{game.champion}</span>
                        <span className="text-xs text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{game.positionKr}</span>
                        <div className="text-sm">
                          <span className="text-green-600 font-semibold">{game.kills}</span>
                          <span className="text-slate-400 mx-0.5">/</span>
                          <span className="text-red-500 font-semibold">{game.deaths}</span>
                          <span className="text-slate-400 mx-0.5">/</span>
                          <span className="text-blue-500 font-semibold">{game.assists}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
                        <span>CS {game.cs}</span>
                        <span>{game.durationStr}</span>
                        <span>{timeAgo(game.date)}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 분석하기 버튼 */}
          {selectedGame && (
            <div className="sticky bottom-0 bg-white pt-3 pb-1">
              <button
                onClick={handleAnalyze}
                disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
              >
                <BrainCircuit className="w-4 h-4" />
                {saving ? "분석 중..." : `${selectedGame.champion} 경기 AI 분석하기 (-30P)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 분석 카드 (목록용) ────────────────────────────────────────────
function AnalysisCard({ analysis, onClick }) {
  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 group border border-slate-200 hover:border-slate-300"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full text-white ${analysis.win ? "bg-blue-500" : "bg-red-400"}`}>
            {analysis.win ? "승리" : "패배"}
          </span>
          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
            {analysis.position_kr}
          </span>
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(analysis.created_at)}
          </span>
        </div>
        <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-blue-600 transition-colors">
          {analysis.summoner_name}<span className="text-slate-400 font-normal text-xs"> #{analysis.tag_line}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">{analysis.champion} · {analysis.duration_str}</p>
      </div>
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{analysis.kills}/{analysis.deaths}/{analysis.assists}</span>
        <span>KDA {analysis.kda}</span>
        <span>CS {analysis.cs}</span>
        <BrainCircuit className="w-3 h-3 ml-auto text-blue-400" />
      </div>
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function ShopPage() {
  const navigate = useNavigate();

  // App.jsx에서 localStorage 기반으로 전달되지 않으므로 직접 읽기
  const savedUser = JSON.parse(localStorage.getItem("user") || "null");
  const isLoggedIn = !!savedUser;
  const userEmail = savedUser?.email || "";
  const [points, setPoints] = useState(savedUser?.points ?? 0);

  const [showAnalysis, setShowAnalysis] = useState(false); // 랜딩 → 게시판 전환
  const [analyses, setAnalyses] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null); // 상세 보기용

  // 포인트 최신화
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`https://judgelol.com/api/users/points?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.points !== undefined) {
          setPoints(data.points);
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...user, points: data.points }));
        }
      })
      .catch(() => {});
  }, [isLoggedIn]);

  // 분석 목록 로드
  const loadAnalyses = async () => {
    if (!isLoggedIn) return;
    setLoadingList(true);
    try {
      const data = await getAnalyses(userEmail);
      setAnalyses(Array.isArray(data) ? data : []);
    } catch {
      setAnalyses([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadAnalyses();
  }, [isLoggedIn]);

  const handleSaved = (id, newPoints) => {
    setShowModal(false);
    if (newPoints !== undefined) {
      setPoints(newPoints);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...user, points: newPoints }));
    }
    loadAnalyses();
    setSelectedId(id);
  };

  const handleDelete = () => {
    setSelectedId(null);
    loadAnalyses();
  };

  // ── 로그인 안 된 경우 ──
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-bold text-lg text-slate-800 mb-2">로그인이 필요합니다</h2>
        <p className="text-slate-400 text-sm mb-6">AI 분석을 이용하려면 먼저 로그인해주세요.</p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2.5 rounded-lg font-bold text-sm text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  // ── 랜딩 화면 (상점 첫 화면) ──
  if (!showAnalysis) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-6">
        <div className="text-center mb-8">
          <h2 className="font-display font-black text-3xl text-slate-800 tracking-wide mb-2">상점</h2>
          <p className="text-slate-400 text-sm">포인트로 이용할 수 있는 서비스입니다</p>
        </div>

        {/* AI 분석 카드 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-bold text-xl text-slate-800 mb-2">내 경기 AI 분석하기</h3>
          <p className="text-slate-400 text-sm mb-1 leading-relaxed">
            내가 플레이한 경기를 AI가 분석해드립니다.<br />
            승률 변화 그래프와 주요 구간을 한눈에 확인하세요.
          </p>
          <div className="flex items-center gap-1.5 mt-3 mb-6 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200">
            <span className="text-sm">🪙</span>
            <span className="text-sm font-bold text-yellow-700">분석당 30포인트</span>
          </div>
          <button
            onClick={() => { setShowAnalysis(true); loadAnalyses(); }}
            className="w-full max-w-xs py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            내 경기 AI 분석하기
          </button>
        </div>
      </div>
    );
  }

  // ── 상세 보기 ──
  if (selectedId !== null) {
    return (
      <AnalysisDetailView
        analysisId={selectedId}
        userEmail={userEmail}
        onBack={() => setSelectedId(null)}
        onDelete={handleDelete}
      />
    );
  }

  // ── 목록 뷰 ──
  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <button
            onClick={() => setShowAnalysis(false)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-semibold transition mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> 상점으로
          </button>
          <h2 className="font-display font-black text-2xl text-slate-800 tracking-wide">
            내 경기 AI 분석
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">AI가 분석한 나의 경기를 확인하세요 · 분석당 30포인트</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
        >
          <BrainCircuit className="w-4 h-4" />
          AI 분석하기
        </button>
      </div>

      {/* 목록 */}
      {loadingList ? (
        <div className="text-center py-20 text-slate-400">불러오는 중...</div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-20 text-slate-400 space-y-3">
          <BrainCircuit className="w-12 h-12 mx-auto text-slate-300" />
          <p className="font-semibold">아직 분석된 경기가 없어요.</p>
          <p className="text-sm">AI 분석하기 버튼을 눌러 첫 경기를 분석해보세요!</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 px-5 py-2 rounded-lg font-bold text-sm text-white hover:opacity-90 transition"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            AI 분석하기
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyses.map((a) => (
            <AnalysisCard
              key={a.id}
              analysis={a}
              onClick={() => setSelectedId(a.id)}
            />
          ))}
        </div>
      )}

      {/* 분석 모달 */}
      {showModal && (
        <AnalyzeModal
          userEmail={userEmail}
          points={points}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

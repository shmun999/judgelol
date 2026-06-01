import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ThumbsUp, ThumbsDown, MessageCircle, Send, Youtube, ArrowLeft, Trash2,
} from "lucide-react";
import { getPost, vote, createComment, likeComment, likePost, deleteComment, deletePost, closePost } from "../api";
import { TIER_COLORS } from "../data/mockData";

// ── YouTube URL → embed URL 변환 유틸 ────────────────────────────
function toEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    let videoId = null;
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") {
      videoId = u.searchParams.get("v");
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    } else if (u.pathname.includes("/shorts/")) {
      videoId = u.pathname.split("/shorts/")[1];
    }

    if (videoId) {
      const t = u.searchParams.get("t");
      const start = t ? parseInt(t) : null;
      const startParam = start ? `?start=${start}` : "";
      return `https://www.youtube.com/embed/${videoId}${startParam}`;
    }
  } catch {}
  return null;
}

// ── WinProbChart ─────────────────────────────────────────────────
function WinProbChart({ data, keyEvents, keyMoments }) {
  const [tooltip, setTooltip] = useState(null); // { minute, prob, cx, cy, events }

  if (!data || data.length === 0) return null;
  const W = 620, H = 220;
  const pl = 46, pr = 20, pt = 26, pb = 36;
  const cw = W - pl - pr;
  const ch = H - pt - pb;
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

  // 분별 이벤트 맵 생성
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
          <linearGradient id="winAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* 그리드 */}
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

        {/* 주요 관전 포인트 강조 */}
        {(keyMoments || []).map((km, i) => (
          <g key={i}>
            <rect
              x={x(Math.max(0, km.minute - 2))} y={pt}
              width={x(km.minute + 2) - x(km.minute - 2)}
              height={ch}
              fill={km.isPositive ? "#22c55e" : "#ef4444"}
              opacity="0.07"
            />
            <line
              x1={x(km.minute)} y1={pt - 4} x2={x(km.minute)} y2={pt + ch}
              stroke={km.isPositive ? "#22c55e" : "#ef4444"}
              strokeWidth="2"
            />
            <rect
              x={Math.min(x(km.minute) - 28, W - 62)} y={pt - 19}
              width="56" height="16" rx="3"
              fill={km.isPositive ? "#22c55e" : "#ef4444"}
            />
            <text
              x={Math.min(x(km.minute), W - 34)} y={pt - 7}
              textAnchor="middle" fontSize="9" fill="white" fontWeight="bold"
            >
              {km.minute}분 {km.isPositive ? "▲" : "▼"}
            </text>
            <circle
              cx={x(km.minute)} cy={y(km.prob)} r="5"
              fill={km.isPositive ? "#22c55e" : "#ef4444"}
              stroke="#0f172a" strokeWidth="1.5"
            />
          </g>
        ))}

        {/* 면적 */}
        <path d={areaPath} fill="url(#winAreaGrad)" />
        {/* 선 */}
        <polyline points={points} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinejoin="round" />

        {/* 호버 포인트 - 각 분마다 투명 원으로 마우스 감지 */}
        {data.map((d) => {
          const cx = x(d.minute);
          const cy = y(d.prob);
          const eventsHere = eventsByMinute[d.minute] || [];
          const isHovered = tooltip?.minute === d.minute;
          return (
            <circle
              key={d.minute}
              cx={cx} cy={cy}
              r={isHovered ? 5 : 4}
              fill={isHovered ? "#ffffff" : "transparent"}
              stroke={isHovered ? "#60a5fa" : "transparent"}
              strokeWidth="1.5"
              style={{ cursor: eventsHere.length > 0 ? "pointer" : "default" }}
              onMouseEnter={() => setTooltip({ minute: d.minute, prob: d.prob, cx, cy, events: eventsHere })}
            />
          );
        })}

        {/* 시작/끝 포인트 */}
        <circle cx={x(data[0].minute)} cy={y(data[0].prob)} r="3" fill="#60a5fa" />
        <circle cx={x(maxMin)} cy={y(lastProb)} r="5"
          fill={lastProb >= 50 ? "#22c55e" : "#f87171"} />
        <text x={Math.min(x(maxMin) + 8, W - 28)} y={y(lastProb) + 4}
          fontSize="11" fill={lastProb >= 50 ? "#22c55e" : "#f87171"} fontWeight="bold">
          {lastProb}%
        </text>

        {/* X축 */}
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

      {/* 툴팁 - SVG 바깥 absolute 포지션 */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            // SVG가 w-full이라 실제 픽셀 비율로 변환
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
                    <span
                      className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: e.isBlue ? "#3b82f6" : "#ef4444" }}
                    />
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

// ── 주요 관전 포인트 카드 ─────────────────────────────────────────
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
          <div key={i}
            className={`rounded-lg p-3 border ${
              km.isPositive
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-600">{km.minute}분</span>
              <span className={`text-xs font-bold ${km.isPositive ? "text-green-600" : "text-red-500"}`}>
                {km.change > 0 ? "+" : ""}{Math.round(km.change)}%
              </span>
            </div>
            <div className={`text-sm font-bold ${km.isPositive ? "text-green-700" : "text-red-600"}`}>
              {km.label}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              승률 → <span className="font-semibold">{km.prob}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── GameInfoSection ───────────────────────────────────────────────
function GameInfoSection({ gameData }) {
  if (!gameData) return null;
  const {
    summonerName, tagLine, champion, positionKr, win,
    kills, deaths, assists, kda, cs, visionScore,
    duration, durationStr, damageDealt,
    winProbability, keyEvents, keyMoments,
    blueTeam, redTeam,
  } = gameData;

  const csPerMin = (cs / (duration / 60)).toFixed(1);
  const dmgK = (damageDealt / 1000).toFixed(1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <h2 className="font-bold text-slate-700 text-sm">게임 데이터 분석</h2>
        <span className="text-xs text-slate-400">AI 모델 기반</span>
      </div>

      <div className="p-5 space-y-5">
        {/* 소환사 정보 */}
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg font-bold text-slate-800">{summonerName}</span>
            <span className="text-sm text-slate-400 font-mono">#{tagLine}</span>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className={`font-bold px-2.5 py-0.5 rounded text-white text-xs ${win ? "bg-blue-500" : "bg-red-400"}`}>
              {win ? "승리" : "패배"}
            </span>
            <span className="font-bold text-slate-700">{champion}</span>
            <span className="text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{positionKr}</span>
            <span className="text-slate-400 text-xs">게임시간 {durationStr}</span>
          </div>
        </div>

        {/* 스탯 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "KDA", value: `${kills} / ${deaths} / ${assists}`, sub: `평점 ${kda}`,
              valueColor: parseFloat(kda) >= 4 ? "text-blue-600" : parseFloat(kda) >= 2 ? "text-slate-800" : "text-red-500" },
            { label: "CS", value: cs, sub: `${csPerMin}/분` },
            { label: "시야 점수", value: visionScore },
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
        <KeyMomentsPanel keyMoments={keyMoments} />

        {/* 승률 그래프 */}
        {winProbability?.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2.5">시간대별 승리 확률 변화</h3>
            <WinProbChart data={winProbability} keyEvents={keyEvents} keyMoments={keyMoments} />
          </div>
        )}

        {/* 팀 구성 */}
        {blueTeam && redTeam && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2.5">팀 구성</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold text-blue-500 mb-1.5">🔵 블루팀</div>
                <div className="space-y-1">
                  {blueTeam.map((p, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-xs rounded px-2.5 py-1.5 ${
                      p.isPlayer ? "bg-blue-50 border border-blue-200 font-semibold" : "bg-slate-50"}`}>
                      {p.isPlayer && <span className="text-blue-500">★</span>}
                      <span className="text-slate-700">{p.champion}</span>
                      <span className="text-slate-400 text-[10px]">{p.role}</span>
                      {p.isPlayer && (
                        <span className="ml-auto text-blue-500 text-[10px] font-bold">
                          {summonerName}#{tagLine}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-red-400 mb-1.5">🔴 레드팀</div>
                <div className="space-y-1">
                  {redTeam.map((p, i) => (
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
  );
}

export default function DetailPage({ isLoggedIn, userName, userEmail, isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votedFor, setVotedFor] = useState(null);
  const [myLike, setMyLike] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [finalOpinion, setFinalOpinion] = useState("");
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState("");

  useEffect(() => {
    getPost(id, userEmail)
      .then((data) => {
        setPost(data);
        if (data.my_voted_option_id) setVotedFor(data.my_voted_option_id);
        if (data.my_like) setMyLike(data.my_like);
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id, userEmail]);

  const handleVote = async (option) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (votedFor !== null) return;
    setVotedFor(option.id);
    await vote(id, option.id, userEmail);
    // 투표 수 로컬 업데이트 (관리자만 count 증가 반영)
    if (isAdmin) {
      setPost((prev) => ({
        ...prev,
        votes: prev.votes.map((v) =>
          v.id === option.id ? { ...v, count: v.count + 1 } : v
        ),
      }));
    }
  };

  const handleComment = async () => {
    if (!isLoggedIn) { navigate("/login"); return; }
    if (!newComment.trim()) return;
    await createComment(id, { content: newComment, author: userName, author_email: userEmail });
    setPost((prev) => ({
      ...prev,
      comments: [
        { id: Date.now(), author: userName, author_email: userEmail, tier: "UNRANKED", content: newComment, created_at: new Date().toISOString(), likes: 0 },
        ...(prev.comments || []),
      ],
    }));
    setNewComment("");
  };

  const handleLikePost = async (type) => {
    if (!isLoggedIn) { navigate("/login"); return; }
    const result = await likePost(id, type, userEmail);
    setPost((prev) => ({ ...prev, likes: result.likes, dislikes: result.dislikes }));
    setMyLike((prev) => prev === type ? null : type);
  };

  const handleLikeComment = async (commentId) => {
    if (!isLoggedIn) { navigate("/login"); return; }
    const result = await likeComment(commentId, userEmail);
    setPost((prev) => ({
      ...prev,
      comments: prev.comments.map((c) =>
        c.id === commentId ? { ...c, likes: result.likes } : c
      ),
    }));
  };

  const handleDeletePost = async () => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
    await deletePost(post.id, userEmail);
    navigate("/board");
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    await deleteComment(commentId, userEmail);
    setPost((prev) => ({
      ...prev,
      comments: prev.comments.filter((c) => c.id !== commentId),
    }));
  };

  const handleClosePost = async () => {
    if (!finalOpinion.trim() || !correctOptionId) {
      setCloseMsg("최종의견과 정답 항목을 모두 입력해주세요.");
      return;
    }
    if (!window.confirm("판정을 완료하시겠습니까? 완료 후에는 되돌릴 수 없습니다.")) return;
    setClosing(true);
    const result = await closePost(post.id, userEmail, finalOpinion, correctOptionId);
    setCloseMsg(result.message || "판정이 완료되었습니다.");
    setPost((prev) => ({
      ...prev,
      is_closed: 1,
      final_opinion: finalOpinion,
      correct_option_id: Number(correctOptionId),
    }));
    setClosing(false);
  };

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;
  if (!post) return <div className="text-center py-20 text-slate-400">게시글을 찾을 수 없습니다.</div>;

  const totalVotes = (post.votes || []).reduce((a, b) => a + b.count, 0);
  const barColors = [
    "linear-gradient(90deg, #3b82f6, #06b6d4)",
    "linear-gradient(90deg, #f59e0b, #ef4444)",
    "linear-gradient(90deg, #8b5cf6, #ec4899)",
    "linear-gradient(90deg, #10b981, #06b6d4)",
  ];

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return "방금";
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> 목록으로
        </button>
        {isAdmin && (
          <button
            onClick={handleDeletePost}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 font-semibold transition"
          >
            <Trash2 className="w-4 h-4" /> 게시글 삭제
          </button>
        )}
      </div>

      {/* 제목 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: TIER_COLORS[post.tier] || "#64748b" }}
          >
            {post.tier}
          </span>
          <span className="text-xs text-slate-400">{timeAgo(post.created_at)}</span>

        </div>
        <h1 className="font-bold text-xl text-slate-800 mb-2 leading-snug">{post.title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{post.description}</p>
      </div>

      {/* 영상 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="aspect-video relative flex items-center justify-center" style={{ background: "#0f172a" }}>
          {(() => {
            const embedUrl = toEmbedUrl(post.youtube_url);
            return embedUrl ? (
              <iframe
                className="w-full h-full"
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="text-center">
                <Youtube className="w-12 h-12 text-red-500 mx-auto mb-2" />
                {post.youtube_url ? (
                  <a href={post.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 text-sm underline">
                    YouTube에서 영상 보기
                  </a>
                ) : (
                  <p className="text-slate-400 text-sm">등록된 영상이 없습니다</p>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      <GameInfoSection gameData={post.gameData} />

      {/* 투표 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
          ⚖️ 누가 더 잘못했나요?
          <span className="text-xs text-slate-400 font-normal ml-1">총 {totalVotes}표</span>
        </h2>
        <div className="space-y-4">
          {(post.votes || []).map((v, i) => {
            const pct = totalVotes ? (v.count / totalVotes) * 100 : 0;
            const isVoted = votedFor === v.id;
            return (
              <div key={v.id}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className={`text-sm font-bold ${isVoted ? "text-blue-600" : post.correct_option_id === v.id ? "text-green-600" : "text-slate-700"}`}>
                    {v.label} {isVoted && "✓"} {post.correct_option_id === v.id && post.is_closed ? "✅ 정답" : ""}
                  </span>
                  {(isAdmin || post.is_closed) && (
                    <span className="text-sm text-slate-500">{v.count}표 ({pct.toFixed(0)}%)</span>
                  )}
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: (isAdmin || post.is_closed) ? `${pct}%` : isVoted ? "100%" : "0%",
                             background: post.correct_option_id === v.id && post.is_closed ? "linear-gradient(90deg, #22c55e, #16a34a)" : barColors[i % barColors.length] }} />
                </div>
                <button
                  onClick={() => handleVote(v)}
                  disabled={votedFor !== null || post.is_closed}
                  className={`w-full py-2 rounded-lg text-sm font-bold transition border ${
                    votedFor === null
                      ? "border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                      : isVoted
                      ? "border-blue-400 text-blue-600 bg-blue-50"
                      : "border-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  {post.is_closed ? "⚖️ 판정 완료" : isVoted ? "✓ 투표 완료" : votedFor !== null ? "—" : !isLoggedIn ? "🔒 로그인 후 투표 가능" : "투표하기"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 pt-4 mt-4 border-t border-slate-100 text-sm text-slate-500">
          <button
            onClick={() => handleLikePost("like")}
            className={`flex items-center gap-1.5 transition font-semibold ${myLike === "like" ? "text-blue-500" : "hover:text-blue-500"}`}
          >
            <ThumbsUp className="w-4 h-4" /> 추천 {post.likes}
          </button>
          <button
            onClick={() => handleLikePost("dislike")}
            className={`flex items-center gap-1.5 transition font-semibold ${myLike === "dislike" ? "text-red-400" : "hover:text-red-400"}`}
          >
            <ThumbsDown className="w-4 h-4" /> 비추천 {post.dislikes}
          </button>
        </div>
      </div>


      {/* 최종 판정 결과 */}
      {post.is_closed && post.final_opinion && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚖️</span>
            <h2 className="font-bold text-blue-800">최종 판정</h2>
            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">판정 완료</span>
          </div>
          <p className="text-slate-700 leading-relaxed">{post.final_opinion}</p>
        </div>
      )}

      {/* 관리자 판정 완료 폼 */}
      {isAdmin && !post.is_closed && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 space-y-4">
          <h2 className="font-bold text-yellow-800 flex items-center gap-2">
            🔑 관리자 판정
          </h2>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">최종 의견</label>
            <textarea
              value={finalOpinion}
              onChange={(e) => setFinalOpinion(e.target.value)}
              placeholder="최종 판정 의견을 작성해주세요..."
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">정답 항목 선택</label>
            <div className="space-y-2">
              {(post.votes || []).map((v) => (
                <label key={v.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  correctOptionId === v.id ? "border-yellow-400 bg-yellow-100" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}>
                  <input
                    type="radio"
                    name="correctOption"
                    value={v.id}
                    checked={correctOptionId === v.id}
                    onChange={() => setCorrectOptionId(v.id)}
                    className="accent-yellow-500"
                  />
                  <span className="font-semibold text-slate-700">{v.label}</span>
                </label>
              ))}
            </div>
          </div>
          {closeMsg && (
            <div className="text-sm font-semibold text-center py-2 rounded-lg bg-yellow-100 text-yellow-800">
              {closeMsg}
            </div>
          )}
          <button
            onClick={handleClosePost}
            disabled={closing}
            className="w-full py-3 rounded-lg font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            {closing ? "처리 중..." : "⚖️ 판정 완료하기"}
          </button>
        </div>
      )}

      {/* 댓글 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-500" />
          판관들의 의견 <span className="text-blue-500">{(post.comments || []).length}</span>
        </h2>
        {isLoggedIn && !post.is_closed ? (
          <div className="flex gap-2 mb-6">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="의견을 남겨보세요"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition"
            />
            <button
              onClick={handleComment}
              className="px-4 py-2.5 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : post.is_closed ? (
          <div className="mb-6 p-4 rounded-lg border border-blue-100 bg-blue-50 text-center">
            <p className="text-sm text-blue-500 font-semibold">⚖️ 판정이 완료되어 댓글을 작성할 수 없습니다.</p>
          </div>
        ) : (
          <div
            className="mb-6 p-4 rounded-lg border border-slate-200 bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition"
            onClick={() => navigate("/login")}
          >
            <p className="text-sm text-slate-400">
              🔒 <span className="text-blue-500 font-semibold">로그인</span>하면 댓글을 작성할 수 있어요
            </p>
          </div>
        )}
        <div className="space-y-4">
          {(post.comments || []).map((c) => (
            <div key={c.id} className="flex gap-3 pb-4 border-b border-slate-100 last:border-0">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white"
                style={{ background: TIER_COLORS[c.tier] || "#64748b" }}
              >
                {c.author[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-slate-700">{c.author}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: TIER_COLORS[c.tier] || "#64748b" }}>
                    {c.tier}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{c.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <button
                    onClick={() => handleLikeComment(c.id)}
                    className="hover:text-blue-500 flex items-center gap-1 transition"
                  >
                    <ThumbsUp className="w-3 h-3" /> {c.likes}
                  </button>
                  {(c.author_email === userEmail || isAdmin) && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="hover:text-red-400 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" /> 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

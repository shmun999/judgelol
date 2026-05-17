import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Search, Check } from "lucide-react";
import { createPost, getSummonerGames } from "../api";

export default function WritePage({ isLoggedIn, userName, userEmail }) {
  const navigate = useNavigate();

  // 로그인 체크
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-bold text-lg text-slate-800 mb-2">로그인이 필요합니다</h2>
        <p className="text-slate-400 text-sm mb-6">글을 작성하려면 먼저 로그인해주세요.</p>
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

  // 기본 폼 상태
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  // 게임 연동 상태
  const [showGameSection, setShowGameSection] = useState(false);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [loadingGames, setLoadingGames] = useState(false);
  const [games, setGames] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const handleOptionChange = (i, value) => {
    const next = [...options];
    next[i] = value;
    setOptions(next);
  };

  const handleLoadGames = async () => {
    if (!gameName || !tagLine) {
      alert("소환사 이름과 태그를 모두 입력해주세요.");
      return;
    }
    setLoadingGames(true);
    setGames(null);
    setSelectedGame(null);
    try {
      const data = await getSummonerGames(gameName, tagLine);
      if (data.error) { alert(data.error); return; }
      setGames(data.games);
    } catch {
      alert("게임 목록을 불러오지 못했습니다. 서버가 실행 중인지 확인해주세요.");
    } finally {
      setLoadingGames(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || options.some((o) => !o)) {
      alert("제목, 내용, 투표 항목을 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const gameData = selectedGame ? { ...selectedGame } : null;
      await createPost({ title, description, youtube_url: youtubeUrl, options, author: userName, author_email: userEmail, gameData });
      navigate("/board");
    } catch {
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-semibold transition"
      >
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </button>

      {/* 기본 폼 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h1 className="font-bold text-xl text-slate-800">새 판정 요청</h1>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 미드가 로밍을 안 간 게 잘못인가요?"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">상황 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="어떤 상황이었는지 자세히 설명해주세요."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">유튜브 영상 링크
            <span className="text-slate-400 font-normal">(선택사항)</span>
          </label>
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">투표 항목</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                placeholder={`항목 ${i + 1}  예) 내 잘못`}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition"
              />
            ))}
            {options.length < 4 && (
              <button
                onClick={() => setOptions([...options, ""])}
                className="text-xs text-blue-500 hover:text-blue-600 font-semibold"
              >
                + 항목 추가 (최대 4개)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 게임 정보 연동 섹션 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowGameSection(!showGameSection)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">🎮 게임 정보 연동</span>
            <span className="text-xs text-slate-400">(선택사항) 판정자에게 AI 분석 데이터를 제공합니다</span>
            {selectedGame && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                ✓ {selectedGame.champion} {selectedGame.positionKr} 연동됨
              </span>
            )}
          </div>
          {showGameSection ? (
            <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
        </button>

        {showGameSection && (
          <div className="px-6 pb-6 space-y-4 border-t border-slate-100">
            {/* 소환사 검색 */}
            <div className="pt-4">
              <label className="block text-xs font-bold text-slate-600 mb-2">
                소환사 이름 (판정자들이 게임 클라이언트에서 직접 찾아볼 수 있습니다)
              </label>
              <div className="flex gap-2">
                <input
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadGames()}
                  placeholder="소환사 이름  예) Hide on bush"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition"
                />
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 text-slate-400 text-sm font-bold">
                  #
                </div>
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

            {/* 게임 목록 */}
            {games && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  최근 게임 목록 — 판정받을 게임을 클릭하세요
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
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded text-white flex-shrink-0 ${
                              game.win ? "bg-blue-500" : "bg-red-400"
                            }`}
                          >
                            {game.win ? "승리" : "패배"}
                          </span>
                          <span className="font-bold text-sm text-slate-800">{game.champion}</span>
                          <span className="text-xs text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                            {game.positionKr}
                          </span>
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

            {/* 선택된 게임 + 판정 시점 */}
            {selectedGame && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-blue-700">
                    ✓ {selectedGame.champion} ({selectedGame.positionKr}) ·{" "}
                    {selectedGame.win ? "승리" : "패배"} · {selectedGame.durationStr}
                  </p>
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="text-xs text-slate-400 hover:text-red-500 transition"
                  >
                    선택 취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
      >
        {submitting ? "등록 중..." : "판정 요청하기"}
      </button>
    </div>
  );
}
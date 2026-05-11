import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { createPost } from "../api";

export default function WritePage({ isLoggedIn, userName }) {
  const navigate = useNavigate();

  // 로그인 안 한 경우 막기
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const handleOptionChange = (i, value) => {
    const next = [...options];
    next[i] = value;
    setOptions(next);
  };

  const handleSubmit = async () => {
    if (!title || !description || !youtubeUrl || options.some((o) => !o)) {
      alert("제목, 내용, 유튜브 링크, 투표 항목을 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createPost({ title, description, youtube_url: youtubeUrl, options, author: userName });
      navigate("/board");
    } catch {
      alert("등록 중 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-semibold transition"
      >
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </button>

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
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            유튜브 영상 링크
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
                placeholder={`항목 ${i + 1} 예) 내 잘못`}
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

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-lg font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
        >
          {submitting ? "등록 중..." : "판정 요청하기"}
        </button>
      </div>
    </div>
  );
}

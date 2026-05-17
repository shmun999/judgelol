import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, CheckSquare, Gamepad2, FileText, MessageSquare } from "lucide-react";

const BASE_URL = "https://judgelol.com/api";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function MyPage({ userName, userEmail, userPicture, points, setPoints, onLogout }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("posts"); // posts | comments
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 라이엇 연동
  const [riotGameName, setRiotGameName] = useState("");
  const [riotTagLine, setRiotTagLine] = useState("");
  const [riotLinked, setRiotLinked] = useState(null); // { gameName, tagLine } | null
  const [riotMsg, setRiotMsg] = useState("");

  // 출석 메시지
  const [attendanceMsg, setAttendanceMsg] = useState("");

  useEffect(() => {
    if (!userEmail) return;
    fetchMyPosts();
    fetchMyComments();
  }, [userEmail]);

  const fetchMyPosts = async () => {
    setLoading(true);
    const res = await fetch(`${BASE_URL}/users/posts?email=${encodeURIComponent(userEmail)}`);
    const data = await res.json();
    setMyPosts(data);
    setLoading(false);
  };

  const fetchMyComments = async () => {
    const res = await fetch(`${BASE_URL}/users/comments?email=${encodeURIComponent(userEmail)}`);
    const data = await res.json();
    setMyComments(data);
  };

  const handleAttendance = async () => {
    const res = await fetch(`${BASE_URL}/users/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setAttendanceMsg("출석 체크 되었습니다! +10 포인트");
      setPoints(data.points);
    } else {
      setAttendanceMsg(data.error || "이미 출석을 하였습니다!");
    }
    setTimeout(() => setAttendanceMsg(""), 3000);
  };

  const handleRiotLink = async () => {
    if (!riotGameName || !riotTagLine) {
      setRiotMsg("소환사 이름과 태그를 입력해주세요.");
      return;
    }
    const res = await fetch(`${BASE_URL}/users/riot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, gameName: riotGameName, tagLine: riotTagLine }),
    });
    const data = await res.json();
    if (res.ok) {
      setRiotLinked({ gameName: riotGameName, tagLine: riotTagLine });
      setRiotMsg("라이엇 계정이 연동되었습니다.");
      setRiotGameName("");
      setRiotTagLine("");
    } else {
      setRiotMsg(data.error || "연동에 실패했습니다.");
    }
    setTimeout(() => setRiotMsg(""), 3000);
  };

  const handleRiotUnlink = async () => {
    await fetch(`${BASE_URL}/users/riot`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });
    setRiotLinked(null);
    setRiotMsg("연동이 해제되었습니다.");
    setTimeout(() => setRiotMsg(""), 3000);
  };

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-5">
      <h1 className="font-bold text-xl text-slate-800 mb-2">마이페이지</h1>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
          <span>🪙</span>
          <span className="font-bold text-yellow-700">{points.toLocaleString()} P</span>
        </div>
      </div>

      {/* 출석 체크 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-500" />
            <div>
              <div className="font-semibold text-slate-800">출석 체크</div>
              <div className="text-xs text-slate-400">매일 출석하면 10 포인트를 받아요</div>
            </div>
          </div>
          <button
            onClick={handleAttendance}
            className="px-4 py-2 rounded-lg text-white text-sm font-bold transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            출석 체크하기
          </button>
        </div>
        {attendanceMsg && (
          <div className="mt-3 text-sm text-center font-semibold text-blue-600 bg-blue-50 rounded-lg py-2">
            {attendanceMsg}
          </div>
        )}
      </div>

      {/* 라이엇 계정 연동 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Gamepad2 className="w-5 h-5 text-red-500" />
          <div className="font-semibold text-slate-800">Riot 계정 연동</div>
        </div>

        {riotLinked ? (
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
            <div>
              <div className="font-bold text-slate-700">{riotLinked.gameName}<span className="text-slate-400 font-normal">#{riotLinked.tagLine}</span></div>
              <div className="text-xs text-slate-400 mt-0.5">연동된 라이엇 계정</div>
            </div>
            <button
              onClick={handleRiotUnlink}
              className="text-xs text-red-400 hover:text-red-600 font-semibold"
            >
              연동 해제
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="소환사 이름"
                value={riotGameName}
                onChange={(e) => setRiotGameName(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <div className="flex items-center text-slate-400 font-bold">#</div>
              <input
                type="text"
                placeholder="태그"
                value={riotTagLine}
                onChange={(e) => setRiotTagLine(e.target.value)}
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={handleRiotLink}
                className="px-4 py-2 rounded-lg text-white text-sm font-bold transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}
              >
                연동하기
              </button>
            </div>
            <p className="text-xs text-slate-400">※ 실제 라이엇 API 연동은 준비 중입니다.</p>
          </div>
        )}

        {riotMsg && (
          <div className="text-sm text-center font-semibold text-blue-600 bg-blue-50 rounded-lg py-2">
            {riotMsg}
          </div>
        )}
      </div>

      {/* 내 게시글 / 댓글 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
              tab === "posts" ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-4 h-4" /> 내 게시글
          </button>
          <button
            onClick={() => setTab("comments")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
              tab === "comments" ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> 내 댓글
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {tab === "posts" && (
            loading ? (
              <div className="py-10 text-center text-slate-400 text-sm">불러오는 중...</div>
            ) : myPosts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">작성한 게시글이 없어요.</div>
            ) : (
              myPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/board/${post.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{post.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{timeAgo(post.created_at)} · 댓글 {post.comment_count}</div>
                  </div>
                  <span className="text-xs text-slate-400">→</span>
                </Link>
              ))
            )
          )}

          {tab === "comments" && (
            myComments.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">작성한 댓글이 없어요.</div>
            ) : (
              myComments.map((comment) => (
                <Link
                  key={comment.id}
                  to={`/board/${comment.post_id}`}
                  className="block px-5 py-4 hover:bg-slate-50 transition"
                >
                  <div className="text-xs text-slate-400 mb-1">{comment.post_title}</div>
                  <div className="text-sm text-slate-700">{comment.content}</div>
                  <div className="text-xs text-slate-400 mt-1">{timeAgo(comment.created_at)}</div>
                </Link>
              ))
            )
          )}
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

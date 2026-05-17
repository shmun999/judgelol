import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, CheckSquare, Gamepad2, ChevronDown, ChevronUp, FileText, MessageSquare } from "lucide-react";

const BASE_URL = "https://judgelol.com/api";
const PAGE_SIZE = 10;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function Pagination({ total, page, setPage }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 py-3 border-t border-slate-100">
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
            page === i ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}

export default function MyPage({ userName, userEmail, userPicture, points, setPoints, onLogout }) {
  const navigate = useNavigate();

  // 출석
  const [attendanceMsg, setAttendanceMsg] = useState("");

  // 내 게시글/댓글 아코디언
  const [showActivity, setShowActivity] = useState(false);
  const [activityTab, setActivityTab] = useState("posts");
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [postsPage, setPostsPage] = useState(0);
  const [commentsPage, setCommentsPage] = useState(0);

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

  const handleToggleActivity = async () => {
    const next = !showActivity;
    setShowActivity(next);
    if (next && myPosts.length === 0) {
      setLoadingActivity(true);
      const [postsRes, commentsRes] = await Promise.all([
        fetch(`${BASE_URL}/users/posts?email=${encodeURIComponent(userEmail)}`),
        fetch(`${BASE_URL}/users/comments?email=${encodeURIComponent(userEmail)}`),
      ]);
      setMyPosts(await postsRes.json());
      setMyComments(await commentsRes.json());
      setLoadingActivity(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  const pagedPosts = myPosts.slice(postsPage * PAGE_SIZE, (postsPage + 1) * PAGE_SIZE);
  const pagedComments = myComments.slice(commentsPage * PAGE_SIZE, (commentsPage + 1) * PAGE_SIZE);

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
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-red-500" />
            <div>
              <div className="font-semibold text-slate-800">Riot 계정 연동</div>
              <div className="text-xs text-slate-400">연동된 계정이 없습니다</div>
            </div>
          </div>
          <button
            onClick={() => alert("라이엇 API 연동 준비 중입니다.")}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-red-300 text-red-500 hover:bg-red-50 transition"
          >
            연동하러 가기
          </button>
        </div>
      </div>

      {/* 내 게시글/댓글 보기 아코디언 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={handleToggleActivity}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
        >
          <span className="font-semibold text-slate-800">내 게시글/댓글 보기</span>
          {showActivity ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showActivity && (
          <div className="border-t border-slate-100">
            {/* 탭 */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActivityTab("posts")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
                  activityTab === "posts" ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-4 h-4" /> 내 게시글
              </button>
              <button
                onClick={() => setActivityTab("comments")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
                  activityTab === "comments" ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <MessageSquare className="w-4 h-4" /> 내 댓글
              </button>
            </div>

            {/* 내용 */}
            {loadingActivity ? (
              <div className="py-10 text-center text-slate-400 text-sm">불러오는 중...</div>
            ) : activityTab === "posts" ? (
              <>
                <div className="divide-y divide-slate-100">
                  {pagedPosts.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm">작성한 게시글이 없어요.</div>
                  ) : (
                    pagedPosts.map((post) => (
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
                  )}
                </div>
                <Pagination total={myPosts.length} page={postsPage} setPage={setPostsPage} />
              </>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {pagedComments.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm">작성한 댓글이 없어요.</div>
                  ) : (
                    pagedComments.map((comment) => (
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
                  )}
                </div>
                <Pagination total={myComments.length} page={commentsPage} setPage={setCommentsPage} />
              </>
            )}
          </div>
        )}
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

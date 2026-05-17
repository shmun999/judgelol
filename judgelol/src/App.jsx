import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import PostsPage from "./pages/PostsPage";
import DetailPage from "./pages/DetailPage";
import LoginPage from "./pages/LoginPage";
import WritePage from "./pages/WritePage";
import ComingSoonPage from "./pages/ComingSoonPage";
import MyPage from "./pages/MyPage";

const BASE_URL = "https://judgelol.com/api";

export default function App() {
  const savedUser = JSON.parse(localStorage.getItem("user") || "null");

  const [isLoggedIn, setIsLoggedIn] = useState(!!savedUser);
  const [userName, setUserName] = useState(savedUser?.name || "");
  const [userEmail, setUserEmail] = useState(savedUser?.email || "");
  const [userPicture, setUserPicture] = useState(savedUser?.picture || "");
  const [isAdmin, setIsAdmin] = useState(savedUser?.email === "keomjongseol@gmail.com");
  const [points, setPoints] = useState(savedUser?.points ?? 0);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserName("");
    setUserEmail("");
    setUserPicture("");
    setIsAdmin(false);
    setPoints(0);
  };

  const handleLogin = async (name, email, picture) => {
    // 백엔드에 유저 등록 및 포인트 조회
    const res = await fetch(`${BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, picture }),
    });
    const data = await res.json();
    const userPoints = data.points ?? 0;

    localStorage.setItem("user", JSON.stringify({ name, email, picture, points: userPoints }));
    setIsLoggedIn(true);
    setUserName(name);
    setUserEmail(email);
    setUserPicture(picture);
    setIsAdmin(email === "keomjongseol@gmail.com");
    setPoints(userPoints);
  };

  return (
    <GoogleOAuthProvider clientId="321227243125-dujc9l08u4i5cfq02c0lkh29m54uuh31.apps.googleusercontent.com">
    <BrowserRouter>
      <div
        className="min-h-screen text-slate-800"
        style={{
          fontFamily: "'Rajdhani', 'Noto Sans KR', system-ui, sans-serif",
          background: "#f1f3f5",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@600;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap"
          rel="stylesheet"
        />

        <Header isLoggedIn={isLoggedIn} userName={userName} userPicture={userPicture} points={points} />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/board" element={<PostsPage />} />
            <Route path="/board/:id" element={<DetailPage isLoggedIn={isLoggedIn} userName={userName} userEmail={userEmail} isAdmin={isAdmin} />} />
            <Route path="/write" element={<WritePage isLoggedIn={isLoggedIn} userName={userName} userEmail={userEmail} />} />
            <Route path="/shop" element={<ComingSoonPage title="상점" />} />
            <Route path="/mypage" element={
              <MyPage
                userName={userName}
                userEmail={userEmail}
                userPicture={userPicture}
                points={points}
                setPoints={setPoints}
                onLogout={handleLogout}
              />}
            />
            <Route
              path="/login"
              element={<LoginPage onLogin={handleLogin} />}
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

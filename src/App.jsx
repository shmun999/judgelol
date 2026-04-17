import { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import PostsPage from "./pages/PostsPage";
import DetailPage from "./pages/DetailPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [page, setPage] = useState("home");
  const [currentPostId, setCurrentPostId] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userTier, setUserTier] = useState("");

  const navigate = (target, postId) => {
    setPage(target);
    if (postId) setCurrentPostId(postId);
    window.scrollTo(0, 0);
  };

  return (
    <div
      className="min-h-screen text-slate-200"
      style={{
        fontFamily: "'Rajdhani', 'Noto Sans KR', system-ui, sans-serif",
        background:
          "radial-gradient(ellipse at top, #0a1628 0%, #050912 40%, #000000 100%)",
      }}
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@600;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      <Header
        page={page}
        navigate={navigate}
        isLoggedIn={isLoggedIn}
        userName={userName}
        userTier={userTier}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {page === "home" && <HomePage navigate={navigate} />}
        {page === "posts" && <PostsPage navigate={navigate} />}
        {page === "detail" && (
          <DetailPage postId={currentPostId} navigate={navigate} />
        )}
        {page === "login" && (
          <LoginPage
            onLogin={(name, tier) => {
              setIsLoggedIn(true);
              setUserName(name);
              setUserTier(tier);
              navigate("home");
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

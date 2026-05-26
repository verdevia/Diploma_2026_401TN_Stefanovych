import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./features/header"
import Footer from "./features/footer"
import Home from "./features/home";
import Market from "./features/market";
import Profile from "./features/profile";
import LoginModal from "./features/loginmod";
import AdminModal from "./features/adminmodal";
import ChatModal from "./features/chatmodal";
import { clearSession, persistSession, readSession } from "./api/client";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return null;
}

export default function App() {
  const [session, setSession] = useState(() => readSession());
  const [modal, setModal] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [chatTarget, setChatTarget] = useState(null);

  function openAuth(mode = "signin") {
    setAuthMode(mode);
    setModal("auth");
  }

  function handleAuthenticated(nextSession) {
    persistSession(nextSession);
    setSession(nextSession);
    setModal(null);
  }

  function handleSessionUpdate(nextUser) {
    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      user: nextUser,
    };

    persistSession(nextSession);
    setSession(nextSession);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setModal(null);
    setChatTarget(null);
  }

  function openChats(target = null) {
    if (!session) {
      openAuth("signin");
      return;
    }

    setChatTarget(target);
    setModal("chats");
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header
        session={session}
        onOpenAuth={openAuth}
        onOpenAdmin={() => setModal("admin")}
        onOpenChats={() => openChats()}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/" element={<Home session={session} onOpenAuth={openAuth} />} />
        <Route
          path="/market"
          element={
            <Market
              session={session}
              onOpenAuth={openAuth}
              onOpenChats={openChats}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <Profile
              session={session}
              onOpenAuth={openAuth}
              onOpenChats={openChats}
              onSessionUpdate={handleSessionUpdate}
            />
          }
        />
      </Routes>
      <Footer />
      {modal === "auth" && (
        <LoginModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setModal(null)}
          onAuthenticated={handleAuthenticated}
        />
      )}
      {modal === "admin" && session && (
        <AdminModal
          session={session}
          onClose={() => setModal(null)}
          onOpenAuth={openAuth}
          onOpenChats={openChats}
        />
      )}
      {modal === "chats" && session && (
        <ChatModal
          session={session}
          target={chatTarget}
          onClose={() => setModal(null)}
        />
      )}
    </BrowserRouter>
  )
}

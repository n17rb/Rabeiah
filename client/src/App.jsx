import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api.js";

import Setup from "./pages/Setup.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Customers from "./pages/Customers.jsx";
import Products from "./pages/Products.jsx";
import Users from "./pages/Users.jsx";
import BottomNav from "./components/BottomNav.jsx";

export default function App() {
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    api.setupStatus()
      .then((r) => setNeedsSetup(r.needsSetup))
      .catch(() => setNeedsSetup(false))
      .finally(() => setLoadingSetup(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  if (loadingSetup) {
    return <div className="centered-screen">جاري التحميل...</div>;
  }

  if (needsSetup) {
    return <Setup onDone={(u) => { setUser(u); setNeedsSetup(false); }} />;
  }

  if (!user) {
    return <Login onLoggedIn={setUser} />;
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <strong>مياه جوهرة</strong>
        <button className="btn-danger-text" onClick={handleLogout}>خروج</button>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/customers" element={<Customers />} />
        {user.role === "admin" && <Route path="/products" element={<Products />} />}
        {user.role === "admin" && <Route path="/users" element={<Users />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomNav role={user.role} />
    </div>
  );
}

import { useState } from "react";
import { api } from "../api.js";

export default function Setup({ onDone }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createFirstAdmin({ full_name: fullName, username, password });
      const loginResult = await api.login({ username, password });
      localStorage.setItem("token", loginResult.token);
      localStorage.setItem("user", JSON.stringify(loginResult.user));
      onDone(loginResult.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centered-screen">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 className="title-lg">إعداد النظام لأول مرة</h1>
        <p className="text-secondary" style={{ marginBottom: 20 }}>
          هذه الشاشة تظهر مرة واحدة فقط لإنشاء أول حساب مدير للنظام.
        </p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>الاسم الكامل</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="field">
            <label>اسم المستخدم</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label>كلمة المرور (6 أحرف على الأقل)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? "جاري الإنشاء..." : "إنشاء حساب المدير"}
          </button>
        </form>
      </div>
    </div>
  );
}

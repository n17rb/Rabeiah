import { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.login({ username, password });
      // التعامل مع كل الاحتمالات الممكنة لرد الـ API لضمان عدم حدوث أي خطأ
      const token = result?.token || result?.access_token || result?.f?.token || (typeof result === "string" ? result : null);
      const user = result?.user || { username };

      if (!token) {
        throw new Error("فشل الحصول على رمز المصادقة من السيرفر.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      onLoggedIn(user);
    } catch (err) {
      setError(err.message || "حدث خطأ أثناء تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centered-screen">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 className="title-lg">مياه جوهرة</h1>
        <p className="text-secondary" style={{ marginBottom: 20 }}>تسجيل الدخول لنظام التوزيع</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>اسم المستخدم</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>كلمة المرور</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

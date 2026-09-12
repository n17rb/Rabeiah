import { useNavigate } from "react-router-dom";

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  return (
    <div className="page">
      <h1 className="title-lg">مياه جوهرة</h1>
      <p className="text-secondary" style={{ marginBottom: 20 }}>
        أهلًا {user.full_name} — {user.role === "admin" ? "مدير النظام" : "سائق توزيع"}
      </p>

      <div className="card">
        <p style={{ margin: 0 }}>
          ✅ Phase 1 شغالة: إدارة العملاء والمنتجات والمستخدمين.
          <br />
          المراحل القادمة (الطلبات، الرحلات، التقارير) ستُضاف لاحقًا فوق هذا الأساس.
        </p>
      </div>

      <button className="btn-primary" style={{ marginBottom: 12 }} onClick={() => navigate("/customers")}>
        ＋ زبون جديد / بحث عن عميل
      </button>

      {user.role === "admin" && (
        <button className="btn-secondary" onClick={() => navigate("/products")}>
          🧴 إدارة المنتجات والأسعار
        </button>
      )}
    </div>
  );
}

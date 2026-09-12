import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    try {
      const result = await api.getProducts(true);
      setProducts(result);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function savePrice(id) {
    try {
      await api.updateProduct(id, { unit_price: parseFloat(editPrice) });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStatus(p) {
    const newStatus = p.status === "active" ? "paused" : "active";
    await api.updateProduct(p.id, { status: newStatus });
    load();
  }

  async function archive(p) {
    if (!confirm(`أرشفة "${p.name}"؟`)) return;
    await api.archiveProduct(p.id);
    load();
  }

  return (
    <div className="page">
      <h1 className="title-lg">المنتجات والأسعار</h1>
      {error && <div className="error-box">{error}</div>}

      <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? "إغلاق" : "＋ إضافة منتج جديد"}
      </button>

      {showAdd && <AddProductForm onSaved={() => { setShowAdd(false); load(); }} />}

      <div className="card" style={{ padding: 0 }}>
        {products.map((p) => (
          <div key={p.id} className="customer-row" style={{ padding: "12px 14px", flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <span className="badge">{p.status === "active" ? "فعّال" : p.status === "paused" ? "موقوف" : "مؤرشف"}</span>
              </div>

              {editingId === p.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    style={{ width: 80, padding: 8 }}
                    className="tabular-num"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    type="number"
                    step="0.01"
                  />
                  <button className="btn-secondary" style={{ width: "auto", padding: "8px 12px" }} onClick={() => savePrice(p.id)}>حفظ</button>
                </div>
              ) : (
                <div
                  className="tabular-num"
                  style={{ fontWeight: 700, cursor: "pointer" }}
                  onClick={() => { setEditingId(p.id); setEditPrice(p.unit_price); }}
                >
                  {Number(p.unit_price).toFixed(2)} JD ✏️
                </div>
              )}
            </div>

            {p.status !== "archived" && (
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button className="btn-danger-text" onClick={() => toggleStatus(p)}>
                  {p.status === "active" ? "إيقاف" : "تفعيل"}
                </button>
                <button className="btn-danger-text" onClick={() => archive(p)}>أرشفة</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddProductForm({ onSaved }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createProduct({ name, unit_price: parseFloat(price) });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>اسم المنتج</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>السعر (JD)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" required />
        </div>
        <button className="btn-primary">إضافة المنتج</button>
      </form>
    </div>
  );
}

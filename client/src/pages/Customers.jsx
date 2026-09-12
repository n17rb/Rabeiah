import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Customers() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState(null);

  async function search(q) {
    setLoading(true);
    setError("");
    try {
      const result = await api.getCustomers(q);
      setCustomers(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search("");
  }, []);

  function handleSearchChange(e) {
    const q = e.target.value;
    setQuery(q);
    search(q);
  }

  return (
    <div className="page">
      <h1 className="title-lg">العملاء</h1>

      {!showAddForm && !selected && (
        <>
          <div className="field">
            <input
              placeholder="ابحث برقم الهاتف، الاسم، أو رقم العميل..."
              value={query}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>

          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowAddForm(true)}>
            ＋ زبون جديد
          </button>

          {error && <div className="error-box">{error}</div>}
          {loading && <p className="text-secondary">جاري البحث...</p>}

          <div className="card" style={{ padding: 0 }}>
            {customers.length === 0 && !loading && (
              <p className="text-secondary" style={{ padding: 14 }}>لا يوجد عملاء مطابقون.</p>
            )}
            {customers.map((c) => (
              <div key={c.id} className="customer-row" onClick={() => setSelected(c)} style={{ cursor: "pointer", padding: "10px 14px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="text-secondary tabular-num">{c.phone_display} · #{c.sequential_number}</div>
                </div>
                {c.region_name && <span className="badge">{c.region_name}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {showAddForm && (
        <AddCustomerForm
          onCancel={() => setShowAddForm(false)}
          onSaved={(c) => {
            setShowAddForm(false);
            search(query);
            setSelected(c);
          }}
        />
      )}

      {selected && !showAddForm && (
        <CustomerDetail customer={selected} onBack={() => { setSelected(null); search(query); }} />
      )}
    </div>
  );
}

function AddCustomerForm({ onCancel, onSaved }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const result = await api.createCustomer({ name, phone });
      if (result.alreadyExists) {
        setInfo(result.message);
      }
      onSaved(result.customer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="title-md">إضافة زبون جديد</h2>
      {error && <div className="error-box">{error}</div>}
      {info && <div className="success-box">{info}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>اسم العميل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>رقم الهاتف</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="07xxxxxxxx" />
        </div>
        <button className="btn-primary" disabled={loading} style={{ marginBottom: 10 }}>
          {loading ? "جاري الحفظ..." : "حفظ العميل"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>إلغاء</button>
      </form>
    </div>
  );
}

function CustomerDetail({ customer, onBack }) {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(customer.building_photo_url || null);
  const [error, setError] = useState("");

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await api.uploadCustomerPhoto(customer.id, file);
      setPhotoUrl(result.photoUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <button className="btn-danger-text" style={{ marginBottom: 10 }} onClick={onBack}>← رجوع لقائمة العملاء</button>

      <h2 className="title-md">{customer.name}</h2>
      <p className="tabular-num text-secondary">{customer.phone_display} · #{customer.sequential_number}</p>

      {error && <div className="error-box">{error}</div>}

      {photoUrl ? (
        <img src={photoUrl} alt="صورة العمارة" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
      ) : (
        <p className="text-secondary">لا توجد صورة للعمارة بعد.</p>
      )}

      <label className="btn-secondary" style={{ display: "block", textAlign: "center" }}>
        {uploading ? "جاري الرفع..." : "📸 رفع / تغيير صورة العمارة"}
        <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
      </label>
    </div>
  );
}

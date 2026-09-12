import { NavLink } from "react-router-dom";

export default function BottomNav({ role }) {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
        <span className="nav-icon">🏠</span>
        الرئيسية
      </NavLink>
      <NavLink to="/customers" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
        <span className="nav-icon">👥</span>
        العملاء
      </NavLink>
      {role === "admin" && (
        <NavLink to="/products" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
          <span className="nav-icon">🧴</span>
          المنتجات
        </NavLink>
      )}
      {role === "admin" && (
        <NavLink to="/users" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
          <span className="nav-icon">🔑</span>
          المستخدمون
        </NavLink>
      )}
    </nav>
  );
}

import { useEffect } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
// Theme helper (added with the Settings page) keeps the chosen console theme.
import { syncAdminTheme } from "../../lib/adminTheme";
import {
  BikeIcon,
  GridIcon,
  LayersIcon,
  ReceiptIcon,
  SettingsIcon,
  SliceMark,
  UsersIcon
} from "../../components/Icons";

const navItems = [
  { to: "/admin", label: "Overview", end: true, Icon: GridIcon },
  { to: "/admin/orders", label: "Orders", Icon: ReceiptIcon },
  // Riders link (added with the rider system).
  { to: "/admin/riders", label: "Riders", Icon: BikeIcon },
  { to: "/admin/inventory", label: "Inventory", Icon: LayersIcon },
  // Staff link (split out of Settings): team, attendance and payroll.
  { to: "/admin/staff", label: "Staff", Icon: UsersIcon },
  // Settings link (theme + admin account only).
  { to: "/admin/settings", label: "Settings", Icon: SettingsIcon }
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Re-apply the saved admin theme whenever the console is mounted so a
  // reload or a direct link keeps the dark/warm choice.
  useEffect(() => {
    syncAdminTheme();
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand admin-brand" to="/admin">
          <span className="brand-mark" aria-hidden="true">
            <SliceMark size={24} />
          </span>
          <span className="brand-name">
            Slice<span>House</span>
          </span>
        </Link>

        <p className="admin-badge">Admin console</p>

        <nav className="admin-nav" aria-label="Admin sections">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "admin-nav-link is-active" : "admin-nav-link"
              }
            >
              <span aria-hidden="true">
                <item.Icon size={18} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-side-foot">
          <p className="admin-user">
            {user?.name}
            <span>{user?.email}</span>
          </p>
          <Link className="admin-store-link" to="/">
            ← Back to storefront
          </Link>
          <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Slice House operations</p>
            <h1>Kitchen &amp; inventory</h1>
          </div>
          <span className="admin-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric"
            })}
          </span>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

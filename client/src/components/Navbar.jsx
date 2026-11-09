import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { CartIcon, SliceMark } from "./Icons";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/menu", label: "Menu" },
  { to: "/build", label: "Build your own" },
  { to: "/orders", label: "My orders" }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container nav-shell">
        <Link className="brand" to="/" aria-label="Slice House home">
          <span className="brand-mark" aria-hidden="true">
            <SliceMark size={24} />
          </span>
          <span className="brand-name">
            Slice<span>House</span>
          </span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span className={`burger ${open ? "is-open" : ""}`} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>

        <nav id="site-nav" className={`site-nav ${open ? "is-open" : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {link.label}
            </NavLink>
          ))}

          <div className="nav-actions">
            <Link to="/checkout" className="cart-link" aria-label={`Cart, ${count} items`}>
              <CartIcon size={19} />
              <span className="cart-label">Cart</span>
              {count > 0 && (
                <span className="cart-count" key={count}>
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="nav-user">
                <span className="nav-user-name" title={user.email}>
                  {user.name.split(" ")[0]}
                </span>
                {user.role === "admin" && (
                  <Link to="/admin" className="nav-link nav-admin">
                    Admin
                  </Link>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            ) : (
              <div className="nav-auth">
                <Link to="/login" className="nav-link">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Create account
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

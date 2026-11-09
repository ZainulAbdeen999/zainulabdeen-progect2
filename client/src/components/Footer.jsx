import { Link } from "react-router-dom";
import { SliceMark } from "./Icons";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand brand-footer" to="/">
            <span className="brand-mark" aria-hidden="true">
              <SliceMark size={24} />
            </span>
            <span className="brand-name">
              Slice<span>House</span>
            </span>
          </Link>
          <p className="footer-copy">
            Hand-tossed dough, slow-cooked sauce and a kitchen that tells you
            exactly where your pizza is. Built as a full-stack project by
            Zain Tech.
          </p>
        </div>

        <div>
          <h2 className="footer-title">Order</h2>
          <ul className="footer-links">
            <li><Link to="/menu">Pizza varieties</Link></li>
            <li><Link to="/build">Build your own</Link></li>
            <li><Link to="/orders">Track an order</Link></li>
            <li><Link to="/checkout">Your cart</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="footer-title">Account</h2>
          <ul className="footer-links">
            <li><Link to="/login">Sign in</Link></li>
            <li><Link to="/register">Create account</Link></li>
            <li><Link to="/forgot-password">Forgot password</Link></li>
            <li><Link to="/admin/login">Admin console</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="footer-title">Visit</h2>
          <address className="footer-address">
            {/* Mirpur Khas storefront (delivery area for this build). */}
            Shop 12, Station Road
            <br />
            Mirpur Khas, Sindh
            <br />
            Open 11:00 – 23:30
            <br />
            <a href="mailto:hello@slicehouse.test">hello@slicehouse.test</a>
          </address>
        </div>
      </div>

      <div className="container footer-signature">
        <span>Designed &amp; built by</span>
        <strong>Zain Tech</strong>
        <span>Independent build · 2026</span>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Slice House. Demo project — not a real restaurant.</p>
        <p>React · Node · Express · MongoDB · Razorpay</p>
      </div>
    </footer>
  );
}

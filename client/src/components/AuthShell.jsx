import { Link } from "react-router-dom";
import { SliceMark } from "./Icons";

export default function AuthShell({
  eyebrow = "Slice House account",
  title,
  subtitle,
  children,
  footer,
  wide = false
}) {
  return (
    <section className="auth-page">
      <div className={`auth-card ${wide ? "auth-card-wide" : ""}`}>
        <div className="auth-panel">
          <Link className="brand auth-brand" to="/">
            <span className="brand-mark" aria-hidden="true">
              <SliceMark size={24} />
            </span>
            <span className="brand-name">
              Slice<span>House</span>
            </span>
          </Link>

          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}

          {children}

          {footer && <div className="auth-footer">{footer}</div>}
        </div>

        <aside className="auth-aside" aria-hidden="true">
          <img src="/images/hero.jpg" alt="" />
          <div className="auth-aside-copy">
            <p className="eyebrow">Since 2026</p>
            <h2>Dough made this morning. Sauce cooked for four hours.</h2>
            <p>Five bases, five sauces, eight vegetables — or start from the menu.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

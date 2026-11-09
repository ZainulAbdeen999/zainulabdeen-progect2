import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container empty-state">
        <p className="eyebrow">404</p>
        <h1>This slice is missing</h1>
        <p>The page you asked for isn't on the menu. Let's get you back to the good stuff.</p>
        <div className="empty-actions">
          <Link className="btn btn-primary" to="/">
            Back to home
          </Link>
          <Link className="btn btn-ghost" to="/menu">
            Browse the menu
          </Link>
        </div>
      </div>
    </section>
  );
}

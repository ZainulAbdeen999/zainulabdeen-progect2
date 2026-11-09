import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/AuthShell";
import { useAuth } from "../../context/AuthContext";
import { apiMessage } from "../../lib/api";

/*
 * Rider sign-in page (added with the rider system).
 * Deliberately separate from the customer and admin logins: only accounts with
 * role "rider" can open the rider dashboard.
 */
export default function RiderLogin() {
  const { user, riderLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "rider@slicehouse.test",
    password: "Rider@12345"
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Already signed in as a rider — go straight to the dashboard.
    if (user?.role === "rider") navigate("/rider", { replace: true });
  }, [user, navigate]);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await riderLogin(form.email.trim(), form.password);
      navigate("/rider", { replace: true });
    } catch (err) {
      setError(apiMessage(err, "Could not sign in to the rider dashboard."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Delivery team"
      title="Rider dashboard"
      subtitle="See your assigned orders, claim new deliveries, collect cash and close orders with the customer's OTP."
      footer={
        <p>
          <Link to="/">← Back to the storefront</Link>
          <br />
          <Link to="/admin/login">Admin sign-in</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit}>
        {error && (
          <div className="notice notice-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        <label className="field">
          <span>Rider email</span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={form.email}
            onChange={update("email")}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={update("password")}
            required
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in as rider"}
        </button>
      </form>

      <div className="notice notice-info">
        <p>
          <strong>Seeded demo rider:</strong> rider@slicehouse.test / Rider@12345
          <br />
          The admin can create more riders from the Riders page.
        </p>
      </div>
    </AuthShell>
  );
}

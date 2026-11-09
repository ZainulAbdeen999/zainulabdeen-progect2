import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/AuthShell";
import { useAuth } from "../../context/AuthContext";
import { apiMessage } from "../../lib/api";

export default function AdminLogin() {
  const { user, adminLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "admin@slicehouse.test",
    password: "Admin@12345"
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") navigate("/admin", { replace: true });
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
      await adminLogin(form.email.trim(), form.password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(apiMessage(err, "Could not sign in to the admin console."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Staff only"
      title="Admin console"
      subtitle="Manage orders, move them through the kitchen and keep inventory topped up."
      footer={
        <p>
          <Link to="/">← Back to the storefront</Link>
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
          <span>Admin email</span>
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
          {busy ? "Signing in…" : "Sign in to admin"}
        </button>
      </form>

      <div className="notice notice-info">
        <p>
          <strong>Seeded demo admin:</strong> admin@slicehouse.test / Admin@12345
          <br />
          Change these in <code>server/.env</code> before deploying.
        </p>
      </div>
    </AuthShell>
  );
}

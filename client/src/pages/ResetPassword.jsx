import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { api, apiMessage } from "../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("Password must include at least one letter and one number.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password: form.password
      });
      setDone(true);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="This link is incomplete"
        subtitle="Open the reset link from your email, or request a new one."
        footer={
          <p>
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        }
      >
        <Link className="btn btn-primary btn-block" to="/login">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        eyebrow="Password updated"
        title="All set"
        subtitle="Your password has been changed and older sessions were signed out."
        footer={
          <p>
            <Link to="/login">Sign in with your new password →</Link>
          </p>
        }
      >
        <div className="notice notice-success">
          <p>Password updated successfully.</p>
        </div>
        <Link className="btn btn-primary btn-block" to="/login">
          Continue to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Choose a new password"
      subtitle="This link can be used once and expires 60 minutes after it was sent."
      footer={
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="notice notice-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        <label className="field">
          <span>New password</span>
          <div className="field-with-action">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update("password")}
              placeholder="At least 8 characters"
              required
            />
            <button
              type="button"
              className="field-action"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <label className="field">
          <span>Confirm new password</span>
          <input
            type={showPassword ? "text" : "password"}
            name="confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update("confirm")}
            placeholder="Repeat your password"
            required
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}

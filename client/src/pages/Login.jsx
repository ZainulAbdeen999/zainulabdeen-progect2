import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { api, apiCode, apiMessage } from "../lib/api";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState(null);

  useEffect(() => {
    if (!user) return;
    navigate(user.role === "admin" ? "/admin" : from, { replace: true });
  }, [user, from, navigate]);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError("");
      setErrorCode("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setErrorCode("");
    setResendNote(null);

    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiMessage(err, "Could not sign in. Please try again."));
      setErrorCode(apiCode(err) || "");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setResendBusy(true);
    setResendNote(null);
    try {
      const { data } = await api.post("/auth/resend-verification", {
        email: form.email.trim()
      });
      setResendNote({
        tone: "success",
        message: data.message,
        link: data.devVerifyUrl
      });
    } catch (err) {
      setResendNote({ tone: "error", message: apiMessage(err) });
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Slice House"
      subtitle="Your cart, your orders and live kitchen updates are waiting."
      footer={
        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="notice notice-error" role="alert">
            <p>{error}</p>
            {errorCode === "EMAIL_NOT_VERIFIED" && (
              <div className="notice-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resendVerification}
                  disabled={resendBusy || !form.email}
                >
                  {resendBusy ? "Sending…" : "Resend verification email"}
                </button>
              </div>
            )}
          </div>
        )}

        {resendNote && (
          <div className={`notice notice-${resendNote.tone}`}>
            <p>{resendNote.message}</p>
            {resendNote.link && (
              <p>
                <a href={resendNote.link}>Open the verification link →</a>
              </p>
            )}
          </div>
        )}

        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <div className="field-with-action">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={update("password")}
              placeholder="Your password"
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

        <div className="form-row form-row-between">
          <Link className="text-link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

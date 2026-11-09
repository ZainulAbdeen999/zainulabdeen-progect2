import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { api, apiMessage } from "../lib/api";

function passwordProblem(password) {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[a-zA-Z]/.test(password)) return "Password must include at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return "";
}

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [resendBusy, setResendBusy] = useState(false);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    const problem = passwordProblem(form.password);
    if (problem) {
      setError(problem);
      return;
    }
    if (form.password !== form.confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password
      });
      setResult(data);
    } catch (err) {
      setError(apiMessage(err, "Could not create your account."));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResendBusy(true);
    try {
      const { data } = await api.post("/auth/resend-verification", {
        email: result.email
      });
      setResult((current) => ({ ...current, ...data }));
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setResendBusy(false);
    }
  }

  if (result) {
    return (
      <AuthShell
        eyebrow="One more step"
        title="Check your inbox"
        subtitle={`We sent a verification link to ${result.email}.`}
        footer={
          <p>
            Already verified? <Link to="/login">Sign in</Link>
          </p>
        }
      >
        <div className="notice notice-success">
          <p>{result.message}</p>
        </div>

        {result.devVerifyUrl && (
          <div className="notice notice-info">
            <p>
              <strong>Development mode:</strong> SMTP is not configured, so the
              email was saved to <code>server/dev-outbox/</code>. Use this link
              to verify instantly:
            </p>
            <p>
              <a className="btn btn-secondary btn-block" href={result.devVerifyUrl}>
                Open verification link
              </a>
            </p>
          </div>
        )}

        <div className="form-row">
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={resend}
            disabled={resendBusy}
          >
            {resendBusy ? "Sending…" : "Resend verification email"}
          </button>
        </div>

        {error && (
          <div className="notice notice-error" role="alert">
            <p>{error}</p>
          </div>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create an account"
      title="Let's get you fed"
      subtitle="Verify your email once, then order and track every pizza from your dashboard."
      footer={
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
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
          <span>Full name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={update("name")}
            placeholder="Zain ul Abdeen"
            required
          />
        </label>

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
          <small className="field-hint">8+ characters, including a letter and a number.</small>
        </label>

        <label className="field">
          <span>Confirm password</span>
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
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

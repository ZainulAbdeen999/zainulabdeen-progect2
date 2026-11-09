import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { api, apiMessage } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setResult(data);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Password help"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a single-use reset link."
      footer={
        <p>
          Remembered it? <Link to="/login">Back to sign in</Link>
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
          <span>Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder="you@example.com"
            required
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {result && (
        <div className="notice notice-success">
          <p>{result.message}</p>
          {result.devResetUrl && (
            <>
              <p>
                <strong>Development mode:</strong> SMTP is not configured, so the
                email was saved to <code>server/dev-outbox/</code>.
              </p>
              <p>
                <a className="btn btn-secondary btn-block" href={result.devResetUrl}>
                  Open reset link
                </a>
              </p>
            </>
          )}
        </div>
      )}
    </AuthShell>
  );
}

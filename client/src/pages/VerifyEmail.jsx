import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { api, apiMessage } from "../lib/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const started = useRef(false);

  const [state, setState] = useState(
    token ? { status: "checking" } : { status: "missing" }
  );
  const [email, setEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resend, setResend] = useState(null);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    api
      .post("/auth/verify-email", { token })
      .then(({ data }) => {
        setState({ status: "success", user: data.user, message: data.message });
      })
      .catch((error) => {
        setState({ status: "error", message: apiMessage(error) });
      });
  }, [token]);

  async function handleResend(event) {
    event.preventDefault();
    setResendBusy(true);
    setResend(null);

    try {
      const { data } = await api.post("/auth/resend-verification", { email });
      setResend({ tone: "success", message: data.message, link: data.devVerifyUrl });
    } catch (error) {
      setResend({ tone: "error", message: apiMessage(error) });
    } finally {
      setResendBusy(false);
    }
  }

  if (state.status === "checking") {
    return (
      <AuthShell eyebrow="Verifying" title="Checking your link…" subtitle="This only takes a second.">
        <div className="page-loading page-loading-inline">
          <span className="spinner" aria-hidden="true" />
        </div>
      </AuthShell>
    );
  }

  if (state.status === "success") {
    return (
      <AuthShell
        eyebrow="Email verified"
        title="You're in!"
        subtitle={state.user ? `${state.user.email} is confirmed.` : "Your email is confirmed."}
        footer={
          <p>
            <Link to="/login">Sign in to start ordering →</Link>
          </p>
        }
      >
        <div className="notice notice-success">
          <p>{state.message}</p>
        </div>
        <Link className="btn btn-primary btn-block" to="/login">
          Continue to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Verification"
      title={state.status === "missing" ? "Open the link from your email" : "That link has expired"}
      subtitle={
        state.status === "missing"
          ? "Verification links are sent when you create an account."
          : state.message
      }
      footer={
        <p>
          Already verified? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleResend}>
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={resendBusy}>
          {resendBusy ? "Sending…" : "Send me a new link"}
        </button>
      </form>

      {resend && (
        <div className={`notice notice-${resend.tone}`}>
          <p>{resend.message}</p>
          {resend.link && (
            <p>
              <a href={resend.link}>Open the verification link →</a>
            </p>
          )}
        </div>
      )}
    </AuthShell>
  );
}

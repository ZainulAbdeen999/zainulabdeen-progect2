import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiMessage } from "../../lib/api";
import {
  ADMIN_THEMES,
  getAdminTheme,
  onAdminThemeChange,
  setAdminTheme
} from "../../lib/adminTheme";
import { CheckIcon, SettingsIcon, UsersIcon } from "../../components/Icons";

/*
 * Admin Settings page — settings only.
 *
 *  1. Appearance — warm cream or midnight theme for the admin console only.
 *  2. Admin account — display name, username (login email) and password.
 *
 * Staff information, attendance and payroll now live on their own page at
 * /admin/staff (AdminStaff.jsx).
 */

/* Edit the signed-in admin's display name and login email ("username"). */
function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Keep the form in sync if the session user changes elsewhere.
  useEffect(() => {
    setForm({ name: user?.name || "", email: user?.email || "" });
  }, [user]);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError("");
      setNotice("");
    };
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (form.name.trim().length < 2) {
      setError("Enter your name (at least 2 characters).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email address for your username.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.patch("/auth/profile", {
        name: form.name.trim(),
        email: form.email.trim()
      });
      setNotice(data.message || "Profile updated");
      onSaved?.(data.user);
    } catch (err) {
      setError(apiMessage(err, "Could not update your profile."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings-profile" onSubmit={submit}>
      {error && (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      {notice && (
        <div className="notice notice-success">
          <p>{notice}</p>
        </div>
      )}

      <div className="form-grid">
        <label className="field">
          <span>Display name</span>
          <input
            type="text"
            value={form.name}
            onChange={update("name")}
            placeholder="Slice House Admin"
            autoComplete="name"
            required
          />
        </label>

        <label className="field">
          <span>Username (email)</span>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="admin@slicehouse.test"
            autoComplete="username"
            required
          />
        </label>
      </div>

      <p className="settings-hint">
        This is the name and email shown in the console and used to sign in.
      </p>

      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

/* Change-password form for the signed-in admin. */
function PasswordForm({ onDone }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError("");
      setNotice("");
    };
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (!/[a-zA-Z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
      setError("New password must include at least one letter and one number.");
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setNotice(data.message || "Password updated");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      onDone?.(data.message);
    } catch (err) {
      setError(apiMessage(err, "Could not change the password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings-password" onSubmit={submit}>
      {error && (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      {notice && (
        <div className="notice notice-success">
          <p>{notice}</p>
        </div>
      )}

      <div className="form-grid">
        <label className="field field-span">
          <span>Current password</span>
          <input
            type="password"
            value={form.currentPassword}
            onChange={update("currentPassword")}
            autoComplete="current-password"
            required
          />
        </label>

        <label className="field">
          <span>New password</span>
          <input
            type="password"
            value={form.newPassword}
            onChange={update("newPassword")}
            autoComplete="new-password"
            placeholder="8+ characters"
            required
          />
        </label>

        <label className="field">
          <span>Confirm new password</span>
          <input
            type="password"
            value={form.confirm}
            onChange={update("confirm")}
            autoComplete="new-password"
            required
          />
        </label>
      </div>

      <p className="settings-hint">
        Changing the password signs out every other device; this session stays
        signed in.
      </p>

      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}

export default function AdminSettings() {
  const { user, setUser } = useAuth();
  const [theme, setTheme] = useState(getAdminTheme);
  const [notice, setNotice] = useState("");

  // Keep the settings page in sync when the theme is changed anywhere else.
  useEffect(() => {
    const unsubscribe = onAdminThemeChange(setTheme);
    return unsubscribe;
  }, []);

  function chooseTheme(id) {
    setTheme(setAdminTheme(id));
  }

  return (
    <div className="admin-page settings-page">
      <header className="admin-page-head">
        <div>
          <h2>Settings</h2>
          <p>Theme and your admin account — display name, username and password.</p>
        </div>
      </header>

      {notice && (
        <div className="notice notice-success">
          <p>{notice}</p>
        </div>
      )}

      <div className="settings-grid">
        {/* ------------------------------ Theme ------------------------------ */}
        <section className="panel settings-card">
          <header className="settings-card-head">
            <span className="settings-icon" aria-hidden="true">
              <SettingsIcon size={18} />
            </span>
            <div>
              <h3>Appearance</h3>
              <p>Changes the admin console only — the storefront keeps its warm theme.</p>
            </div>
          </header>

          <div className="theme-options" role="radiogroup" aria-label="Admin theme">
            {ADMIN_THEMES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={theme === option.id}
                className={`theme-option ${theme === option.id ? "is-active" : ""}`}
                onClick={() => chooseTheme(option.id)}
              >
                <span className={`theme-swatch theme-swatch-${option.id}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="theme-copy">
                  <strong>{option.label}</strong>
                  <small>{option.note}</small>
                </span>
                {theme === option.id && (
                  <span className="theme-check" aria-hidden="true">
                    <CheckIcon size={15} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ----------------------------- Account ----------------------------- */}
        <section className="panel settings-card">
          <header className="settings-card-head">
            <span className="settings-icon" aria-hidden="true">
              <UsersIcon size={18} />
            </span>
            <div>
              <h3>Admin account</h3>
              <p>Your display name, username and password.</p>
            </div>
          </header>

          <ProfileForm
            user={user}
            onSaved={(nextUser) => {
              // Update the sidebar/header immediately; the form shows its own
              // success notice so we do not duplicate it at page level.
              if (nextUser) setUser(nextUser);
            }}
          />

          <hr className="settings-divider" />

          <h4 className="settings-subhead">Change password</h4>
          <PasswordForm onDone={setNotice} />
        </section>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { api, apiMessage } from "../../lib/api";
import { formatDate, inr } from "../../lib/format";
import { BikeIcon, CheckIcon } from "../../components/Icons";

/*
 * Admin Riders page (added with the rider system).
 *
 * Lets the owner:
 *  - create, edit and deactivate rider accounts,
 *  - see each rider's active/delivered counts,
 *  - see the COD cash each rider is holding and settle it after handover.
 *
 * Everything talks to the existing admin API under /api/admin/riders.
 */

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  phone: "",
  vehicle: "",
  active: true
};

/* Small stat tile reused across the top of the page. */
function RiderStat({ label, value, foot, accent = false, warn = false }) {
  return (
    <div
      className={`stat-card ${accent ? "stat-card-accent" : ""} ${
        warn ? "stat-card-warn" : ""
      }`.trim()}
    >
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-foot">{foot}</p>
    </div>
  );
}

/* Create/edit form. Password is optional while editing. */
function RiderForm({ editing, busy, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);

  // Load the selected rider into the form whenever the edit target changes.
  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        email: editing.email || "",
        password: "",
        phone: editing.phone || "",
        vehicle: editing.vehicle || "",
        active: editing.active !== false
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing]);

  function update(field) {
    return (event) => {
      const value =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="panel rider-form" onSubmit={submit}>
      <header className="panel-head">
        <div>
          <h3>{editing ? `Edit ${editing.name}` : "Add a rider"}</h3>
          <p>
            {editing
              ? "Update the profile, reset the password, or pause the account."
              : "Riders sign in at /rider/login with this email and password."}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          disabled={busy}
        >
          Close
        </button>
      </header>

      {error && (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="form-grid rider-form-grid">
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            value={form.name}
            onChange={update("name")}
            placeholder="Ali Raza"
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="rider@slicehouse.test"
            required
          />
        </label>

        <label className="field">
          <span>
            Password{" "}
            {editing && <small>(leave blank to keep the current one)</small>}
          </span>
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            placeholder={editing ? "New password (optional)" : "8+ characters"}
            autoComplete="new-password"
            required={!editing}
          />
        </label>

        <label className="field">
          <span>Phone</span>
          <input
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="03xx xxxxxxx"
          />
        </label>

        <label className="field">
          <span>Vehicle / plate</span>
          <input
            type="text"
            value={form.vehicle}
            onChange={update("vehicle")}
            placeholder="MPS-1234"
          />
        </label>

        <label className="field field-check">
          <input
            type="checkbox"
            checked={form.active}
            onChange={update("active")}
          />
          <span>Active — can sign in and receive orders</span>
        </label>
      </div>

      <div className="rider-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Create rider"}
        </button>
      </div>
    </form>
  );
}

export default function AdminRiders() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: payload } = await api.get("/admin/riders");
      setData(payload);
      setError("");
    } catch (err) {
      setError(apiMessage(err));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let timer;

    async function tick() {
      try {
        const { data: payload } = await api.get("/admin/riders");
        if (!alive) return;
        setData(payload);
        setError("");
      } catch (err) {
        if (alive) setError(apiMessage(err));
      }
    }

    tick();
    // Cash and active counts change while riders work, so poll like the other
    // admin pages.
    timer = window.setInterval(tick, 10000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(rider) {
    setEditing(rider);
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setFormError("");
  }

  async function saveRider(form) {
    setBusyId(editing?.id || "new");
    setFormError("");
    setNotice("");

    try {
      if (editing) {
        // Empty password means "keep the current password".
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        const { data: result } = await api.patch(
          `/admin/riders/${editing.id}`,
          payload
        );
        setNotice(result.message);
      } else {
        const { data: result } = await api.post("/admin/riders", form);
        setNotice(result.message);
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(apiMessage(err, "Could not save the rider."));
    } finally {
      setBusyId("");
    }
  }

  async function toggleActive(rider) {
    setBusyId(rider.id);
    setNotice("");
    setError("");

    try {
      const { data: result } = await api.patch(`/admin/riders/${rider.id}`, {
        active: !rider.active
      });
      setNotice(
        `${rider.name} is now ${result.rider.active ? "active" : "inactive"}.`
      );
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  async function settle(rider) {
    if (
      !window.confirm(
        `Confirm you received ${inr(rider.stats.cashInHand)} in cash from ${rider.name}?`
      )
    ) {
      return;
    }

    setBusyId(rider.id);
    setNotice("");
    setError("");

    try {
      const { data: result } = await api.post(
        `/admin/riders/${rider.id}/settle`
      );
      setNotice(
        result.count
          ? `${result.message} · ${inr(result.total)} across ${result.count} order${
              result.count === 1 ? "" : "s"
            }.`
          : result.message
      );
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  const totals = data?.totals;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2>Riders</h2>
          <p>
            Manage delivery staff, watch their COD cash in hand and settle the
            handover. Updates every 10 seconds.
          </p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            Add rider
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
            Refresh
          </button>
        </div>
      </header>

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

      {formOpen && (
        <RiderForm
          editing={editing}
          busy={busyId === (editing?.id || "new")}
          error={formError}
          onCancel={closeForm}
          onSubmit={saveRider}
        />
      )}

      {totals && (
        <div className="stat-grid">
          <RiderStat
            label="Riders"
            value={totals.riders}
            foot={`${totals.activeRiders} active`}
            accent
          />
          <RiderStat
            label="Cash in hand"
            value={inr(totals.cashInHand)}
            foot="Collected by riders, not yet settled"
            warn={totals.cashInHand > 0}
          />
          <RiderStat
            label="Unassigned orders"
            value={totals.unassignedOrders}
            foot="Waiting for a rider to claim or be assigned"
          />
          <RiderStat
            label="Delivery city"
            value="Mirpur Khas"
            foot="Riders deliver across 69000 only"
          />
        </div>
      )}

      {!data && !error && (
        <div className="admin-loading">
          <span className="spinner" aria-hidden="true" />
          <p>Loading riders…</p>
        </div>
      )}

      {data && data.riders.length === 0 && (
        <div className="panel panel-empty-state">
          <h3>No riders yet</h3>
          <p>Add your first rider so orders can be assigned or claimed.</p>
        </div>
      )}

      {data && data.riders.length > 0 && (
        <div className="rider-admin-list">
          {data.riders.map((rider) => {
            const busy = busyId === rider.id;

            return (
              <article
                className={`panel rider-admin-card ${rider.active ? "" : "is-inactive"}`}
                key={rider.id}
              >
                <header className="rider-admin-head">
                  <div className="rider-admin-identity">
                    <span className="rider-admin-avatar" aria-hidden="true">
                      <BikeIcon size={20} />
                    </span>
                    <div>
                      <h3>{rider.name}</h3>
                      <p>{rider.email}</p>
                    </div>
                  </div>
                  <span
                    className={`status-pill ${
                      rider.active ? "status-success" : "status-muted"
                    }`}
                  >
                    {rider.active ? "Active" : "Inactive"}
                  </span>
                </header>

                <dl className="rider-admin-meta">
                  <div>
                    <dt>Phone</dt>
                    <dd>{rider.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt>Vehicle</dt>
                    <dd>{rider.vehicle || "—"}</dd>
                  </div>
                  <div>
                    <dt>Added</dt>
                    <dd>{formatDate(rider.createdAt)}</dd>
                  </div>
                </dl>

                <div className="rider-admin-stats">
                  <div>
                    <strong>{rider.stats.active}</strong>
                    <span>active orders</span>
                  </div>
                  <div>
                    <strong>{rider.stats.delivered}</strong>
                    <span>delivered</span>
                  </div>
                  <div className={rider.stats.cashInHand > 0 ? "is-cash" : ""}>
                    <strong>{inr(rider.stats.cashInHand)}</strong>
                    <span>
                      cash in hand
                      {rider.stats.cashOrders
                        ? ` · ${rider.stats.cashOrders} order${
                            rider.stats.cashOrders === 1 ? "" : "s"
                          }`
                        : ""}
                    </span>
                  </div>
                </div>

                <footer className="rider-admin-actions">
                  {rider.stats.cashInHand > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => settle(rider)}
                    >
                      {busy ? "Settling…" : `Settle ${inr(rider.stats.cashInHand)}`}
                    </button>
                  )}

                  {rider.stats.cashInHand === 0 && rider.stats.cashOrders === 0 && (
                    <span className="rider-settled">
                      <CheckIcon size={14} /> No cash pending
                    </span>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => openEdit(rider)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => toggleActive(rider)}
                  >
                    {rider.active ? "Deactivate" : "Activate"}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

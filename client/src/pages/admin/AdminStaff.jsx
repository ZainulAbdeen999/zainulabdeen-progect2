import { useCallback, useEffect, useMemo, useState } from "react";
import { api, apiMessage } from "../../lib/api";
import { formatDate, inr } from "../../lib/format";
import {
  BikeIcon,
  CalendarIcon,
  CheckIcon,
  UsersIcon,
  WalletIcon
} from "../../components/Icons";

/*
 * Admin Staff page (split out of Settings).
 *
 * Settings now only holds theme + admin account details; everything about the
 * team lives here: staff records, daily attendance, monthly salary and
 * payments. Data comes from /api/admin/staff (StaffMember, Attendance and
 * SalaryPayment models on the server).
 */

const ROLES = ["Manager", "Chef", "Cashier", "Waiter", "Rider", "Other"];

const ATTENDANCE_OPTIONS = [
  { id: "present", label: "Present", short: "P" },
  { id: "half", label: "Half day", short: "H" },
  { id: "absent", label: "Absent", short: "A" },
  { id: "leave", label: "Leave", short: "L" }
];

const EMPTY_FORM = {
  name: "",
  role: "Other",
  phone: "",
  monthlySalary: "",
  joinedAt: "",
  active: true,
  userId: "",
  notes: ""
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

/** Local date key, matching the server's YYYY-MM-DD convention. */
function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function monthLabel(month) {
  const [year, value] = String(month || "").split("-").map(Number);
  if (!year || !value) return month;
  return new Date(year, value - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function roleTone(role) {
  switch (role) {
    case "Rider":
      return "accent";
    case "Chef":
      return "warning";
    case "Cashier":
      return "info";
    case "Manager":
      return "success";
    default:
      return "muted";
  }
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/* Create/edit staff form. */
function StaffForm({ editing, riders, busy, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        role: editing.role || "Other",
        phone: editing.phone || "",
        monthlySalary: editing.monthlySalary ?? "",
        joinedAt: toDateInput(editing.joinedAt),
        active: editing.active !== false,
        userId: editing.userId || "",
        notes: editing.notes || ""
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
    <form className="panel staff-form" onSubmit={submit}>
      <header className="panel-head">
        <div>
          <h3>{editing ? `Edit ${editing.name}` : "Add a staff member"}</h3>
          <p>
            Set the monthly salary and role. Riders can be linked to their login
            account so the payroll list matches the delivery team.
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

      <div className="form-grid staff-form-grid">
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            value={form.name}
            onChange={update("name")}
            placeholder="Bilal Ahmed"
            required
          />
        </label>

        <label className="field">
          <span>Role</span>
          <select value={form.role} onChange={update("role")}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
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
          <span>Monthly salary (₹)</span>
          <input
            type="number"
            min="0"
            step="100"
            value={form.monthlySalary}
            onChange={update("monthlySalary")}
            placeholder="35000"
          />
        </label>

        <label className="field">
          <span>Joined on</span>
          <input type="date" value={form.joinedAt} onChange={update("joinedAt")} />
        </label>

        {form.role === "Rider" && (
          <label className="field">
            <span>
              Rider login <small>(optional)</small>
            </span>
            <select value={form.userId} onChange={update("userId")}>
              <option value="">Not linked</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {rider.name}
                  {rider.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field field-span">
          <span>
            Notes <small>(optional)</small>
          </span>
          <input
            type="text"
            value={form.notes}
            onChange={update("notes")}
            placeholder="Shift timings, advance, etc."
          />
        </label>

        <label className="field field-check">
          <input
            type="checkbox"
            checked={form.active}
            onChange={update("active")}
          />
          <span>Active — included in payroll and attendance</span>
        </label>
      </div>

      <div className="staff-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Add staff"}
        </button>
      </div>
    </form>
  );
}

function Stat({ label, value, foot, accent = false, warn = false }) {
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

export default function AdminStaff() {
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [attendanceDate, setAttendanceDate] = useState(todayKey);
  const [data, setData] = useState(null);
  const [riders, setRiders] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data: payload } = await api.get("/admin/staff", {
        params: { month, date: attendanceDate }
      });
      setData(payload);
      setError("");
    } catch (err) {
      setError(apiMessage(err));
    }
  }, [month, attendanceDate]);

  useEffect(() => {
    load();
  }, [load]);

  // Rider accounts power the optional "link rider login" select.
  useEffect(() => {
    let alive = true;
    api
      .get("/admin/riders")
      .then(({ data: payload }) => {
        if (alive) setRiders(payload.riders || []);
      })
      .catch(() => {
        if (alive) setRiders([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const summary = data?.summary;
  const selectedDateLabel = useMemo(
    () => formatDate(attendanceDate),
    [attendanceDate]
  );

  function changeMonth(next) {
    setMonth(next);
    // Keep the attendance date inside the selected month.
    const today = todayKey();
    setAttendanceDate(today.startsWith(next) ? today : `${next}-01`);
  }

  function changeAttendanceDate(next) {
    setAttendanceDate(next);
    if (next) setMonth(next.slice(0, 7));
  }

  function openCreate() {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(staff) {
    setEditing(staff);
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setFormError("");
  }

  async function saveStaff(form) {
    setBusyId(editing?.id || "new");
    setFormError("");
    setNotice("");

    const payload = {
      name: form.name,
      role: form.role,
      phone: form.phone,
      monthlySalary: form.monthlySalary === "" ? 0 : Number(form.monthlySalary),
      joinedAt: form.joinedAt || undefined,
      active: form.active,
      userId: form.role === "Rider" ? form.userId : "",
      notes: form.notes
    };

    try {
      const { data: result } = editing
        ? await api.patch(`/admin/staff/${editing.id}`, payload)
        : await api.post("/admin/staff", payload);
      setNotice(result.message);
      closeForm();
      await load();
    } catch (err) {
      setFormError(apiMessage(err, "Could not save the staff member."));
    } finally {
      setBusyId("");
    }
  }

  async function toggleActive(staff) {
    setBusyId(staff.id);
    setNotice("");
    setError("");

    try {
      const { data: result } = await api.patch(`/admin/staff/${staff.id}`, {
        active: !staff.active
      });
      setNotice(result.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  async function markAttendance(staff, status) {
    setBusyId(staff.id);
    setNotice("");
    setError("");

    try {
      const { data: result } = await api.post(
        `/admin/staff/${staff.id}/attendance`,
        { date: attendanceDate, status }
      );
      setNotice(result.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  async function paySalary(staff) {
    if (
      !window.confirm(
        `Record ${inr(staff.balance)} salary payment for ${staff.name} (${monthLabel(
          month
        )})?`
      )
    ) {
      return;
    }

    setBusyId(staff.id);
    setNotice("");
    setError("");

    try {
      const { data: result } = await api.post(
        `/admin/staff/${staff.id}/salary`,
        { month }
      );
      setNotice(
        `${result.message} · paid ${inr(result.paid)}` +
          (result.balance > 0 ? `, ${inr(result.balance)} still due.` : ".")
      );
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-page settings-page">
      <header className="admin-page-head">
        <div>
          <h2>Staff</h2>
          <p>
            Staff information, daily attendance and monthly salary — mark days,
            see who worked, and settle the month's pay.
          </p>
        </div>
        <div className="admin-head-actions">
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

      <section className="settings-payroll">
        <header className="payroll-head">
          <div>
            <h3>Staff &amp; payroll</h3>
            <p>
              Mark attendance, see how many days each person worked, and settle
              the month's salary.
            </p>
          </div>
          <div className="payroll-controls">
            <label className="field field-inline">
              <span>Month</span>
              <input
                type="month"
                value={month}
                onChange={(event) => changeMonth(event.target.value)}
              />
            </label>
            <label className="field field-inline">
              <span>Attendance date</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => changeAttendanceDate(event.target.value)}
              />
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              Add staff
            </button>
          </div>
        </header>

        {formOpen && (
          <StaffForm
            editing={editing}
            riders={riders}
            busy={busyId === (editing?.id || "new")}
            error={formError}
            onCancel={closeForm}
            onSubmit={saveStaff}
          />
        )}

        {!data && !error && (
          <div className="admin-loading">
            <span className="spinner" aria-hidden="true" />
            <p>Loading staff…</p>
          </div>
        )}

        {summary && (
          <div className="stat-grid">
            <Stat
              label="Staff"
              value={summary.active}
              foot={`${summary.total} on the books · ${summary.riders} riders`}
              accent
            />
            <Stat
              label="Rider accounts"
              value={summary.riderAccounts}
              foot="Can sign in to the rider dashboard"
            />
            <Stat
              label="Present"
              value={summary.presentToday}
              foot={`Attendance for ${selectedDateLabel || "today"}`}
            />
            <Stat
              label="Monthly payroll"
              value={inr(summary.monthlyPayroll)}
              foot={`Full salary for ${monthLabel(month)}`}
            />
            <Stat
              label="Earned so far"
              value={inr(summary.payable)}
              foot="Based on days marked this month"
            />
            <Stat
              label="Pending"
              value={inr(summary.pending)}
              foot={`${inr(summary.paid)} already paid`}
              warn={summary.pending > 0}
            />
          </div>
        )}

        {data && data.staff.length === 0 && (
          <div className="panel panel-empty-state">
            <h3>No staff yet</h3>
            <p>Add your first staff member to start the attendance and salary book.</p>
          </div>
        )}

        {data && data.staff.length > 0 && (
          <div className="staff-list">
            {data.staff.map((staff) => {
              const busy = busyId === staff.id;

              return (
                <article
                  className={`panel staff-card ${staff.active ? "" : "is-inactive"}`}
                  key={staff.id}
                >
                  <header className="staff-card-head">
                    <div className="staff-identity">
                      <span className="staff-avatar" aria-hidden="true">
                        {initials(staff.name) || "?"}
                      </span>
                      <div>
                        <h3>{staff.name}</h3>
                        <p>
                          {staff.phone || "No phone"} · joined{" "}
                          {formatDate(staff.joinedAt) || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="staff-tags">
                      <span className={`status-pill status-${roleTone(staff.role)}`}>
                        {staff.role}
                      </span>
                      <span
                        className={`status-pill ${
                          staff.active ? "status-success" : "status-muted"
                        }`}
                      >
                        {staff.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </header>

                  <div className="staff-salary-line">
                    <span>
                      <WalletIcon size={15} />
                      {inr(staff.monthlySalary)} / month
                    </span>
                    {staff.userId && (
                      <span className="staff-linked">
                        <BikeIcon size={15} />
                        Linked rider login
                      </span>
                    )}
                    {staff.notes && <span className="staff-note">{staff.notes}</span>}
                  </div>

                  <div className="staff-stats">
                    <div>
                      <strong>{staff.daysCounted}</strong>
                      <span>days this month</span>
                    </div>
                    <div>
                      <strong>{inr(staff.payable)}</strong>
                      <span>earned</span>
                    </div>
                    <div>
                      <strong>{inr(staff.paid)}</strong>
                      <span>paid</span>
                    </div>
                    <div className={staff.balance > 0 ? "is-due" : "is-clear"}>
                      <strong>{inr(staff.balance)}</strong>
                      <span>{staff.balance > 0 ? "balance due" : "settled"}</span>
                    </div>
                  </div>

                  <div className="staff-attendance">
                    <span className="staff-attendance-label">
                      <CalendarIcon size={15} />
                      {selectedDateLabel || "Selected date"}
                      {staff.selectedStatus ? ` · ${staff.selectedStatus}` : ""}
                    </span>
                    <div className="attendance-buttons" role="group" aria-label={`Attendance for ${staff.name}`}>
                      {ATTENDANCE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`attendance-btn ${
                            staff.selectedStatus === option.id ? "is-active" : ""
                          }`}
                          title={option.label}
                          aria-pressed={staff.selectedStatus === option.id}
                          disabled={busy || !staff.active}
                          onClick={() => markAttendance(staff, option.id)}
                        >
                          <strong>{option.short}</strong>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <footer className="staff-actions">
                    {staff.balance > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => paySalary(staff)}
                      >
                        {busy ? "Saving…" : `Pay ${inr(staff.balance)}`}
                      </button>
                    )}

                    {staff.balance === 0 && staff.payable > 0 && (
                      <span className="staff-settled">
                        <CheckIcon size={14} /> Salary settled
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => openEdit(staff)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => toggleActive(staff)}
                    >
                      {staff.active ? "Deactivate" : "Activate"}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

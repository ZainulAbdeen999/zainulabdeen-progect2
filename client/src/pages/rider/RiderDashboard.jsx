import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, apiMessage } from "../../lib/api";
import { formatDateTime, inr, statusTone } from "../../lib/format";
import {
  BikeIcon,
  CheckIcon,
  HomeIcon,
  PhoneIcon,
  SliceMark
} from "../../components/Icons";

const ACTIVE = ["Order Received", "In Kitchen", "Sent to Delivery"];

/*
 * One assigned order card (added with the rider system).
 * The customer's full address and phone are visible because the rider has
 * already claimed/accepted this order.
 */
function AssignedOrder({ order, busy, otpValue, onOtpChange, onAction }) {
  const delivery = order.delivery || {};
  const accepted = Boolean(delivery.acceptedAt);
  const delivered = order.status === "Delivered";
  const active = ACTIVE.includes(order.status);
  const cod = order.payment?.method === "cod";
  const cashCollected = order.payment?.status === "paid";

  const canAccept = ["Order Received", "In Kitchen"].includes(order.status) && !accepted;
  const canPickup = ["Order Received", "In Kitchen"].includes(order.status) && accepted;
  const canRelease = ["Order Received", "In Kitchen"].includes(order.status);
  const canDeliver = order.status === "Sent to Delivery";

  const phoneDigits = String(order.address?.phone || "").replace(/[^\d+]/g, "");
  const mapQuery = encodeURIComponent(
    `${order.address?.line1 || ""}, ${order.address?.city || ""} ${order.address?.pincode || ""}`
  );

  return (
    <article className={`rider-order ${delivered ? "is-done" : ""}`}>
      <header className="rider-order-head">
        <div>
          <p className="order-number">{order.orderNumber}</p>
          <p className="order-date">
            {formatDateTime(order.createdAt)} · {order.items.length}{" "}
            {order.items.length === 1 ? "pizza" : "pizzas"}
          </p>
        </div>
        <div className="rider-order-tags">
          <span className={`status-pill status-${statusTone(order.status)}`}>
            {order.status}
          </span>
          <span className={`rider-pay ${cod ? "is-cod" : "is-online"}`}>
            {cod ? "COD" : "Online paid"}
          </span>
        </div>
      </header>

      <div className="rider-customer">
        <div>
          <h3>{order.address?.fullName}</h3>
          <p>
            {order.address?.line1}
            {order.address?.line2 ? `, ${order.address.line2}` : ""}
            <br />
            {order.address?.city} {order.address?.pincode}
          </p>
        </div>
        <div className="rider-customer-actions">
          {phoneDigits && (
            <a className="btn btn-ghost btn-sm" href={`tel:${phoneDigits}`}>
              <PhoneIcon size={14} /> Call
            </a>
          )}
          <a
            className="btn btn-ghost btn-sm"
            href={`https://maps.google.com/?q=${mapQuery}`}
            target="_blank"
            rel="noreferrer"
          >
            <HomeIcon size={14} /> Map
          </a>
        </div>
      </div>

      <ul className="rider-items">
        {order.items.map((item, index) => (
          <li key={`${order._id}-${index}`}>
            <span>
              {item.quantity} × {item.name}
              <small>{item.size}</small>
            </span>
            <strong>{inr(item.lineTotal)}</strong>
          </li>
        ))}
      </ul>

      <div className="rider-order-foot">
        <span className="rider-total">
          {cod && !cashCollected ? "Collect on delivery" : "Order total"}{" "}
          <strong>{inr(order.total)}</strong>
        </span>
        {cod && cashCollected && !delivery.cashSettledAt && (
          <span className="rider-cash-note">Cash in hand</span>
        )}
        {cod && delivery.cashSettledAt && (
          <span className="rider-cash-note is-settled">Cash settled</span>
        )}
      </div>

      {active && (
        <div className="rider-actions">
          {canAccept && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => onAction(order, "accept")}
            >
              {busy ? "Working…" : "Accept order"}
            </button>
          )}

          {canPickup && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => onAction(order, "pickup")}
            >
              {busy ? "Working…" : "Picked up"}
            </button>
          )}

          {canRelease && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => onAction(order, "release")}
            >
              Release
            </button>
          )}

          {canDeliver && (
            <>
              {cod && !cashCollected && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => onAction(order, "cash")}
                >
                  Cash collected · {inr(order.total)}
                </button>
              )}

              <div className="rider-otp-row">
                <label className="field">
                  <span>Customer OTP</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={otpValue}
                    onChange={(event) =>
                      onOtpChange(
                        order._id,
                        event.target.value.replace(/\D/g, "").slice(0, 4)
                      )
                    }
                    placeholder="4-digit"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={
                    busy ||
                    otpValue.length !== 4 ||
                    (cod && !cashCollected)
                  }
                  onClick={() => onAction(order, "deliver", { otp: otpValue })}
                >
                  {busy ? "Closing…" : "Mark delivered"}
                </button>
              </div>

              {cod && !cashCollected && (
                <p className="rider-hint">
                  Collect the cash first, then enter the customer&apos;s OTP.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {delivered && (
        <div className="rider-done">
          <CheckIcon size={16} />
          <span>
            Delivered {formatDateTime(delivery.deliveredAt)}
            {cod
              ? delivery.cashSettledAt
                ? " · cash settled"
                : " · cash in hand"
              : ""}
          </span>
        </div>
      )}
    </article>
  );
}

/*
 * One card in the available queue.
 * The customer's exact address and phone are intentionally hidden until the
 * rider claims the order, matching the privacy rule in the API.
 */
function AvailableOrder({ order, busy, onClaim }) {
  const cod = order.payment?.method === "cod";

  return (
    <article className="rider-order rider-available">
      <header className="rider-order-head">
        <div>
          <p className="order-number">{order.orderNumber}</p>
          <p className="order-date">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`status-pill status-${statusTone(order.status)}`}>
          {order.status}
        </span>
      </header>

      <div className="rider-available-meta">
        <span>
          <HomeIcon size={14} /> {order.address?.city}{" "}
          {order.address?.pincode}
        </span>
        <span>
          <BikeIcon size={14} /> {order.items.length}{" "}
          {order.items.length === 1 ? "pizza" : "pizzas"}
        </span>
        <span className={`rider-pay ${cod ? "is-cod" : "is-online"}`}>
          {cod ? "COD" : "Online paid"}
        </span>
      </div>

      <ul className="rider-items">
        {order.items.map((item, index) => (
          <li key={`${order._id}-${index}`}>
            <span>
              {item.quantity} × {item.name}
              <small>{item.size}</small>
            </span>
            <strong>{inr(item.lineTotal)}</strong>
          </li>
        ))}
      </ul>

      <div className="rider-order-foot">
        <span className="rider-total">
          Total <strong>{inr(order.total)}</strong>
        </span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => onClaim(order)}
        >
          {busy ? "Claiming…" : "Claim order"}
        </button>
      </div>

      <p className="rider-hint">
        The customer&apos;s full address and phone appear after you claim.
      </p>
    </article>
  );
}

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [tab, setTab] = useState("mine");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [otpValues, setOtpValues] = useState({});

  const load = useCallback(async () => {
    try {
      const { data: payload } = await api.get("/rider/orders");
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
        const { data: payload } = await api.get("/rider/orders");
        if (!alive) return;
        setData(payload);
        setError("");
      } catch (err) {
        if (alive) setError(apiMessage(err));
      }
    }

    tick();
    // Keep the queue fresh while the rider is on the road.
    timer = window.setInterval(tick, 8000);

    function onFocus() {
      tick();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/rider/login", { replace: true });
  }

  async function action(order, path, payload) {
    setBusyId(order._id);
    setNotice("");
    setError("");

    try {
      const { data: result } = await api.post(
        `/rider/orders/${order._id}/${path}`,
        payload
      );
      setNotice(result.message || "Order updated");
      if (path === "deliver") {
        setOtpValues((current) => ({ ...current, [order._id]: "" }));
      }
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  async function claim(order) {
    setBusyId(order._id);
    setNotice("");
    setError("");

    try {
      const { data: result } = await api.post(`/rider/orders/${order._id}/claim`);
      setNotice(result.message || "Order claimed");
      setTab("mine");
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  function setOtp(orderId, value) {
    setOtpValues((current) => ({ ...current, [orderId]: value }));
  }

  const mine = data
    ? [...data.orders].sort((a, b) => {
        const rank = {
          "Sent to Delivery": 0,
          "In Kitchen": 1,
          "Order Received": 2,
          Delivered: 3
        };
        return (
          (rank[a.status] ?? 9) - (rank[b.status] ?? 9) ||
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      })
    : [];

  const available = data?.available || [];
  const summary = data?.summary || {
    active: 0,
    deliveredToday: 0,
    cashInHand: 0,
    cashOrders: 0
  };

  return (
    <div className="rider-shell">
      <header className="rider-topbar">
        <Link className="brand rider-brand" to="/rider">
          <span className="brand-mark" aria-hidden="true">
            <SliceMark size={20} />
          </span>
          <span className="brand-name">
            Slice<span>House</span> rider
          </span>
        </Link>
        <div className="rider-user">
          <span>{user?.name}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="rider-page">
        <section className="rider-hero">
          <p className="eyebrow">Delivery dashboard</p>
          <h1>Hi {user?.name?.split(" ")[0] || "rider"}</h1>
          <p>
            Claim orders, update deliveries and close them with the customer&apos;s
            4-digit OTP.
          </p>

          <div className="rider-summary">
            <div>
              <strong>{summary.active}</strong>
              <span>active orders</span>
            </div>
            <div>
              <strong>{summary.deliveredToday}</strong>
              <span>delivered today</span>
            </div>
            <div>
              <strong>{inr(summary.cashInHand)}</strong>
              <span>
                cash in hand
                {summary.cashOrders
                  ? ` · ${summary.cashOrders} order${summary.cashOrders === 1 ? "" : "s"}`
                  : ""}
              </span>
            </div>
          </div>
        </section>

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

        <div className="rider-tabs" role="group" aria-label="Rider order views">
          <button
            type="button"
            className={tab === "mine" ? "is-active" : ""}
            aria-pressed={tab === "mine"}
            onClick={() => setTab("mine")}
          >
            My orders <span>{mine.length}</span>
          </button>
          <button
            type="button"
            className={tab === "available" ? "is-active" : ""}
            aria-pressed={tab === "available"}
            onClick={() => setTab("available")}
          >
            Available <span>{available.length}</span>
          </button>
        </div>

        {!data && !error && (
          <div className="admin-loading">
            <span className="spinner" aria-hidden="true" />
            <p>Loading your deliveries…</p>
          </div>
        )}

        {data && tab === "mine" && mine.length === 0 && (
          <div className="panel panel-empty-state">
            <h3>No orders assigned yet</h3>
            <p>Check the available queue or wait for the admin to assign one.</p>
          </div>
        )}

        {data && tab === "mine" && mine.length > 0 && (
          <div className="rider-order-list">
            {mine.map((order) => (
              <AssignedOrder
                key={order._id}
                order={order}
                busy={busyId === order._id}
                otpValue={otpValues[order._id] || ""}
                onOtpChange={setOtp}
                onAction={action}
              />
            ))}
          </div>
        )}

        {data && tab === "available" && available.length === 0 && (
          <div className="panel panel-empty-state">
            <h3>No unassigned orders</h3>
            <p>New orders appear here as soon as the kitchen receives them.</p>
          </div>
        )}

        {data && tab === "available" && available.length > 0 && (
          <div className="rider-order-list">
            {available.map((order) => (
              <AvailableOrder
                key={order._id}
                order={order}
                busy={busyId === order._id}
                onClaim={claim}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

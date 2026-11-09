import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiMessage } from "../../lib/api";
import { formatDateTime, inr, statusTone } from "../../lib/format";

const STATUS_ORDER = [
  "Order Received",
  "In Kitchen",
  "Sent to Delivery",
  "Delivered",
  "Pending Payment",
  "Cancelled"
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsResponse, lowStockResponse] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/low-stock")
      ]);
      setData(statsResponse.data);
      setLowStock(lowStockResponse.data);
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
        const [statsResponse, lowStockResponse] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/low-stock")
        ]);
        if (!alive) return;
        setData(statsResponse.data);
        setLowStock(lowStockResponse.data);
        setError("");
      } catch (err) {
        if (alive) setError(apiMessage(err));
      }
    }

    tick();
    timer = window.setInterval(tick, 10000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  async function runLowStockCheck() {
    setChecking(true);
    setNotice("");
    try {
      const { data: result } = await api.post("/admin/low-stock/check");
      setNotice(result.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setChecking(false);
    }
  }

  if (!data && !error) {
    return (
      <div className="admin-loading">
        <span className="spinner" aria-hidden="true" />
        <p>Loading the kitchen…</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2>Overview</h2>
          <p>Live snapshot of orders, revenue and stock. Refreshes every 10 seconds.</p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={runLowStockCheck}
            disabled={checking}
          >
            {checking ? "Checking…" : "Run low-stock check"}
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

      {stats && (
        <>
          <div className="stat-grid">
            <div className="stat-card stat-card-accent">
              <p className="stat-label">Revenue today</p>
              <p className="stat-value">{inr(stats.todayRevenue)}</p>
              <p className="stat-foot">{inr(stats.revenue)} all time</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Orders today</p>
              <p className="stat-value">{stats.todayOrders}</p>
              <p className="stat-foot">{stats.totalOrders} all time</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">In progress</p>
              <p className="stat-value">
                {(stats.statusCounts["Order Received"] || 0) +
                  (stats.statusCounts["In Kitchen"] || 0) +
                  (stats.statusCounts["Sent to Delivery"] || 0)}
              </p>
              <p className="stat-foot">
                {stats.statusCounts["Pending Payment"] || 0} awaiting payment
              </p>
            </div>
            <div className={`stat-card ${stats.lowStockCount ? "stat-card-warn" : ""}`}>
              <p className="stat-label">Low-stock ingredients</p>
              <p className="stat-value">{stats.lowStockCount}</p>
              <p className="stat-foot">
                of {stats.inventoryCount} tracked items · {stats.menuCount} pizzas live
              </p>
            </div>
          </div>

          <div className="admin-columns">
            <section className="panel">
              <header className="panel-head">
                <div>
                  <h3>Order pipeline</h3>
                  <p>Where every order currently sits.</p>
                </div>
                <Link className="text-link" to="/admin/orders">
                  Manage orders →
                </Link>
              </header>

              <ul className="status-list">
                {STATUS_ORDER.map((status) => {
                  const count = stats.statusCounts[status] || 0;
                  const total = stats.totalOrders || 1;
                  return (
                    <li key={status}>
                      <span className={`status-dot status-${statusTone(status)}`} />
                      <span className="status-list-name">{status}</span>
                      <span className="status-list-bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, (count / total) * 100)}%` }} />
                      </span>
                      <strong>{count}</strong>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel">
              <header className="panel-head">
                <div>
                  <h3>Low stock</h3>
                  <p>
                    Threshold {lowStock?.config?.threshold ?? "—"} · checks{" "}
                    <code>{lowStock?.config?.cron ?? "—"}</code>
                  </p>
                </div>
                <Link className="text-link" to="/admin/inventory">
                  Update stock →
                </Link>
              </header>

              {lowStock && lowStock.items.length === 0 && (
                <p className="panel-empty">Everything is above its threshold.</p>
              )}

              {lowStock && lowStock.items.length > 0 && (
                <ul className="low-stock-list">
                  {lowStock.items.map((item) => (
                    <li key={item._id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.category}</span>
                      </div>
                      <div className="low-stock-count">
                        <strong>{item.stock}</strong>
                        <span>threshold {item.threshold}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>Recent orders</h3>
                <p>Latest eight orders across the store.</p>
              </div>
              <Link className="text-link" to="/admin/orders">
                All orders →
              </Link>
            </header>

            {data.recentOrders.length === 0 ? (
              <p className="panel-empty">No orders yet. The first one will appear here.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Placed</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order._id}>
                        <td data-label="Order">
                          <strong>{order.orderNumber}</strong>
                        </td>
                        <td data-label="Customer">
                          {order.user?.name || order.address.fullName}
                          <span className="table-sub">{order.address.city}</span>
                        </td>
                        <td data-label="Placed">{formatDateTime(order.createdAt)}</td>
                        <td data-label="Total">{inr(order.total)}</td>
                        <td data-label="Status">
                          <span className={`status-pill status-${statusTone(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

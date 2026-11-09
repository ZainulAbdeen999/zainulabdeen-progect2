import { useCallback, useEffect, useState } from "react";
import { api, apiMessage } from "../../lib/api";

const CATEGORIES = [
  ["base", "Bases"],
  ["sauce", "Sauces"],
  ["cheese", "Cheeses"],
  ["vegetable", "Vegetables"]
];

export default function AdminInventory() {
  const [items, setItems] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [savedId, setSavedId] = useState("");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/inventory");
      setItems(data.items);
      setConfig(data.config);
      setError("");
    } catch (err) {
      setError(apiMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(id, field, value) {
    setItems((current) =>
      current.map((item) => (item._id === id ? { ...item, [field]: value } : item))
    );
    setSavedId("");
  }

  async function save(item) {
    setSavingId(item._id);
    setNotice("");
    setError("");

    try {
      const { data } = await api.patch(`/admin/inventory/${item._id}`, {
        price: Number(item.price),
        stock: Number(item.stock),
        threshold: Number(item.threshold),
        available: Boolean(item.available)
      });

      setItems((current) =>
        current.map((entry) => (entry._id === item._id ? data.item : entry))
      );
      setSavedId(item._id);
      setNotice(`${item.name} updated.`);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSavingId("");
    }
  }

  async function runLowStockCheck() {
    setChecking(true);
    setNotice("");
    setError("");

    try {
      const { data } = await api.post("/admin/low-stock/check");
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setChecking(false);
    }
  }

  if (!items && !error) {
    return (
      <div className="admin-loading">
        <span className="spinner" aria-hidden="true" />
        <p>Loading inventory…</p>
      </div>
    );
  }

  const grouped = items
    ? items.reduce((accumulator, item) => {
        if (!accumulator[item.category]) accumulator[item.category] = [];
        accumulator[item.category].push(item);
        return accumulator;
      }, {})
    : {};

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2>Inventory</h2>
          <p>
            Every paid order decrements stock automatically. Adjust counts here when
            deliveries arrive.
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={runLowStockCheck}
            disabled={checking}
          >
            {checking ? "Checking…" : "Send low-stock alert now"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
            Refresh
          </button>
        </div>
      </header>

      {config && (
        <div className="config-strip">
          <div>
            <span>Alert threshold</span>
            <strong>{config.threshold} units</strong>
          </div>
          <div>
            <span>Cron schedule</span>
            <strong><code>{config.cron}</code></strong>
          </div>
          <div>
            <span>Email cooldown</span>
            <strong>{config.alertHours} hours</strong>
          </div>
          <div>
            <span>Email delivery</span>
            <strong>{config.smtpConfigured ? "SMTP" : "dev-outbox"}</strong>
          </div>
        </div>
      )}

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

      {CATEGORIES.map(([category, label]) => {
        const group = grouped[category] || [];
        if (group.length === 0) return null;

        return (
          <section className="panel inventory-block" key={category}>
            <header className="panel-head">
              <div>
                <h3>{label}</h3>
                <p>{group.length} ingredients</p>
              </div>
            </header>

            <div className="table-wrap">
              <table className="data-table inventory-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Price (₹)</th>
                    <th>Stock</th>
                    <th>Threshold</th>
                    <th>Available</th>
                    <th aria-label="Save" />
                  </tr>
                </thead>
                <tbody>
                  {group.map((item) => {
                    const low = Number(item.stock) <= Number(item.threshold);
                    const busy = savingId === item._id;

                    return (
                      <tr key={item._id} className={low ? "is-low" : ""}>
                        <td data-label="Ingredient">
                          <strong>{item.name}</strong>
                          <span className="table-sub">
                            {item.code}
                            {low ? " · low stock" : ""}
                          </span>
                        </td>
                        <td data-label="Price">
                          <input
                            className="input-sm"
                            type="number"
                            min="0"
                            step="1"
                            value={item.price}
                            aria-label={`Price for ${item.name}`}
                            onChange={(event) => edit(item._id, "price", event.target.value)}
                          />
                        </td>
                        <td data-label="Stock">
                          <input
                            className="input-sm"
                            type="number"
                            min="0"
                            step="1"
                            value={item.stock}
                            aria-label={`Stock for ${item.name}`}
                            onChange={(event) => edit(item._id, "stock", event.target.value)}
                          />
                        </td>
                        <td data-label="Threshold">
                          <input
                            className="input-sm"
                            type="number"
                            min="0"
                            step="1"
                            value={item.threshold}
                            aria-label={`Threshold for ${item.name}`}
                            onChange={(event) =>
                              edit(item._id, "threshold", event.target.value)
                            }
                          />
                        </td>
                        <td data-label="Available">
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(item.available)}
                              onChange={(event) =>
                                edit(item._id, "available", event.target.checked)
                              }
                            />
                            <span>{item.available ? "Yes" : "No"}</span>
                          </label>
                        </td>
                        <td data-label="Save">
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            disabled={busy}
                            onClick={() => save(item)}
                          >
                            {busy ? "Saving…" : savedId === item._id ? "Saved" : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

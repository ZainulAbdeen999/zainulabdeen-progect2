import { useEffect, useMemo, useState } from "react";
import PizzaCard from "../components/PizzaCard";
import { api, apiMessage } from "../lib/api";
import { inr } from "../lib/format";

const filters = [
  { id: "all", label: "All pizzas" },
  { id: "classic", label: "Classic" },
  { id: "spicy", label: "Spicy" },
  { id: "cheesy", label: "Cheesy" },
  { id: "premium", label: "Premium" },
  { id: "loaded", label: "Loaded" }
];

export default function Menu() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    api
      .get("/menu")
      .then(({ data }) => {
        if (alive) setMenu(data);
      })
      .catch((err) => {
        if (alive) setError(apiMessage(err));
      });

    return () => {
      alive = false;
    };
  }, []);

  const pizzas = useMemo(() => {
    if (!menu) return [];
    const search = query.trim().toLowerCase();

    return menu.pizzas.filter((pizza) => {
      const matchesFilter =
        filter === "all" || (pizza.tags || []).includes(filter);
      const matchesSearch =
        !search ||
        pizza.name.toLowerCase().includes(search) ||
        pizza.description.toLowerCase().includes(search) ||
        pizza.ingredients.some((item) => item.name.toLowerCase().includes(search));
      return matchesFilter && matchesSearch;
    });
  }, [menu, filter, query]);

  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <div>
            <p className="eyebrow">The menu</p>
            <h1>Seven ways to start</h1>
            <p className="section-lead">
              Every price is built from the ingredients on it — change a base or
              a cheese in the admin dashboard and the menu updates instantly.
            </p>
          </div>
          {menu && (
            <dl className="page-hero-stats">
              <div>
                <dt>{menu.pizzas.length}</dt>
                <dd>varieties</dd>
              </div>
              <div>
                <dt>{inr(menu.pricing.freeDeliveryOver)}</dt>
                <dd>for free delivery</dd>
              </div>
              <div>
                <dt>{menu.pricing.taxPercent}%</dt>
                <dd>tax, shown upfront</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="menu-toolbar">
            <div className="filter-chips" role="group" aria-label="Filter pizzas">
              {filters.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`chip ${filter === option.id ? "is-active" : ""}`}
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="search-field">
              <span className="sr-only">Search the menu</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pizzas or ingredients…"
              />
            </label>
          </div>

          {error && (
            <div className="notice notice-error">
              <p>{error}</p>
            </div>
          )}

          {!menu && !error && (
            <div className="card-grid">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div className="pizza-card skeleton-card" key={index}>
                  <div className="skeleton skeleton-media" />
                  <div className="pizza-body">
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line short" />
                    <div className="skeleton skeleton-button" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {menu && pizzas.length === 0 && (
            <div className="empty-state">
              <h2>No pizzas match that</h2>
              <p>Try a different filter or clear your search.</p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                }}
              >
                Reset filters
              </button>
            </div>
          )}

          {menu && pizzas.length > 0 && (
            <>
              <p className="result-count">
                Showing {pizzas.length} of {menu.pizzas.length} pizzas
              </p>
              <div className="card-grid">
                {pizzas.map((pizza) => (
                  <PizzaCard key={pizza.slug} pizza={pizza} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

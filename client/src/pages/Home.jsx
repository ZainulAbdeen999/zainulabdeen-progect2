import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PizzaCard from "../components/PizzaCard";
import { BoxIcon, TrackerIcon, WheatIcon, ArrowRightIcon } from "../components/Icons";
import { api, apiMessage } from "../lib/api";

const steps = [
  {
    number: "01",
    title: "Pick a base",
    copy: "Hand tossed, thin & crisp, cheese burst, whole wheat or garlic herb."
  },
  {
    number: "02",
    title: "Choose a sauce",
    copy: "Classic tomato, basil pesto, smoky BBQ, peri peri or white garlic."
  },
  {
    number: "03",
    title: "Add cheese",
    copy: "Mozzarella, aged cheddar or 12-month parmesan."
  },
  {
    number: "04",
    title: "Load the veggies",
    copy: "Up to eight toppings — onion, capsicum, corn, olives and more."
  }
];

const statuses = [
  ["Order Received", "Payment confirmed and the ticket is on the kitchen rail."],
  ["In Kitchen", "Dough stretched, topped and sliding into the oven."],
  ["Sent to Delivery", "Boxed, sealed and handed to the rider."],
  ["Delivered", "At your door. Enjoy — and rate it next time."]
];

export default function Home() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");

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

  const featured = menu
    ? (menu.pizzas.filter((pizza) => pizza.featured).length
        ? menu.pizzas.filter((pizza) => pizza.featured)
        : menu.pizzas
      ).slice(0, 3)
    : [];

  return (
    <>
      <section className="hero">
        <img className="hero-image" src="/images/hero.jpg" alt="" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light">Full-stack pizza delivery</p>
            <h1>
              Pizza, built
              <span> your way.</span>
            </h1>
            <p className="hero-lead">
              Hand-tossed bases, slow-cooked sauces and eight fresh vegetables.
              Order a house favourite or start from a blank canvas — then watch
              it move from the kitchen to your door.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" to="/build">
                Build your pizza
              </Link>
              <Link className="btn btn-outline-light btn-lg" to="/menu">
                See the menu
              </Link>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>5</dt>
                <dd>bases</dd>
              </div>
              <div>
                <dt>5</dt>
                <dd>sauces</dd>
              </div>
              <div>
                <dt>8</dt>
                <dd>vegetables</dd>
              </div>
              <div>
                <dt>4</dt>
                <dd>live status steps</dd>
              </div>
            </dl>
          </div>

          <div className="hero-note">
            <p className="hero-note-label">Today's dough</p>
            <p className="hero-note-title">Cold-fermented for 24 hours</p>
            <p>
              Every pizza is stretched to order. Nothing sits under a lamp.
            </p>
            <Link className="text-link" to="/menu">
              Browse the varieties <ArrowRightIcon size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="value-strip">
        <div className="container value-grid">
          <div>
            <span className="value-icon" aria-hidden="true">
              <WheatIcon size={24} />
            </span>
            <h2>Dough made daily</h2>
            <p>Mixed, balled and cold-fermented in-house every morning.</p>
          </div>
          <div>
            <span className="value-icon" aria-hidden="true">
              <TrackerIcon size={24} />
            </span>
            <h2>Live order tracking</h2>
            <p>Four statuses, updated by the kitchen and visible on your dashboard.</p>
          </div>
          <div>
            <span className="value-icon" aria-hidden="true">
              <BoxIcon size={24} />
            </span>
            <h2>Stock that counts itself</h2>
            <p>Every paid order decrements inventory; low stock emails the admin.</p>
          </div>
        </div>
      </section>

      <section className="section" id="featured">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">From the menu</p>
              <h2>Kitchen favourites</h2>
            </div>
            <Link className="text-link" to="/menu">
              All {menu ? menu.pizzas.length : ""} varieties <ArrowRightIcon size={15} />
            </Link>
          </header>

          {error && (
            <div className="notice notice-error">
              <p>{error}</p>
            </div>
          )}

          {!menu && !error && (
            <div className="card-grid" aria-hidden="true">
              {[0, 1, 2].map((index) => (
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

          {menu && (
            <div className="card-grid">
              {featured.map((pizza) => (
                <PizzaCard key={pizza.slug} pizza={pizza} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section-tinted">
        <div className="container builder-teaser">
          <div>
            <p className="eyebrow">The custom builder</p>
            <h2>Four steps to your perfect pizza</h2>
            <p className="section-lead">
              Start with a base and sauce, pick a cheese, then load as many
              vegetables as you like. The price updates as you go and the order
              summary is shown before payment.
            </p>
            <ol className="step-list">
              {steps.map((step) => (
                <li key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link className="btn btn-primary" to="/build">
              Start building
            </Link>
          </div>

          <div className="builder-preview" aria-hidden="true">
            <div className="builder-preview-top">
              <span className="preview-pill is-active">Base</span>
              <span className="preview-pill is-active">Sauce</span>
              <span className="preview-pill">Cheese</span>
              <span className="preview-pill">Veggies</span>
            </div>
            <div className="preview-pizza">
              <img
                className="preview-pizza-image"
                src="/images/menu-margherita.jpg"
                alt=""
                loading="lazy"
                width="150"
                height="150"
              />
            </div>
            <dl className="preview-summary">
              <div>
                <dt>Base</dt>
                <dd>Garlic herb</dd>
              </div>
              <div>
                <dt>Sauce</dt>
                <dd>Peri peri</dd>
              </div>
              <div>
                <dt>Cheese</dt>
                <dd>Aged cheddar</dd>
              </div>
              <div>
                <dt>Veggies</dt>
                <dd>Onion · corn · jalapeño</dd>
              </div>
              <div className="preview-total">
                <dt>Medium pizza</dt>
                <dd>₹336</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">No guessing</p>
              <h2>Follow your order, live</h2>
            </div>
            <p className="section-note">
              Your dashboard polls for updates every few seconds. The admin moves
              the order along; you see it immediately.
            </p>
          </header>

          <ol className="tracking-grid">
            {statuses.map(([title, copy], index) => (
              <li key={title}>
                <span className="tracking-number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <p className="eyebrow eyebrow-light">Hungry yet?</p>
            <h2>Your next pizza is four steps away.</h2>
          </div>
          <div className="cta-actions">
            <Link className="btn btn-cream btn-lg" to="/build">
              Build your own
            </Link>
            <Link className="btn btn-outline-light btn-lg" to="/menu">
              Order a favourite
            </Link>
          </div>
        </div>
        <div className="container cta-signature">
          <span>Designed &amp; built by</span>
          <strong>Zain Tech</strong>
          <span>Independent build · 2026</span>
        </div>
      </section>
    </>
  );
}

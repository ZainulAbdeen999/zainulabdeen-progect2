import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll-reveal choreography.
 *
 * Elements matching these selectors fade and rise into place once they enter
 * the viewport. Everything is CSS-driven; this component only adds classes, so
 * the page stays fully visible when JavaScript is unavailable or the visitor
 * prefers reduced motion.
 */
const SELECTOR = [
  ".hero-note",
  ".value-grid > div",
  ".section-head",
  ".pizza-card",
  ".builder-progress",
  ".builder-teaser > *",
  ".builder-main > *",
  ".builder-summary",
  ".menu-toolbar",
  ".checkout-steps",
  ".checkout-main > *",
  ".checkout-aside > *",
  ".summary-card",
  ".order-card",
  ".stat-card",
  ".panel",
  ".admin-order",
  ".cta-inner",
  ".page-hero-inner > *",
  ".tracking-grid > li",
  ".step-list > li",
  ".footer-inner > *"
].join(", ");

export default function MotionRoot() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduce.matches || !("IntersectionObserver" in window)) {
      root.classList.remove("has-motion");
      return undefined;
    }

    root.classList.add("has-motion");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    const seen = new WeakSet();

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);

        const parent = element.parentElement;
        const siblings = parent
          ? [...parent.children].filter((child) => child.matches(SELECTOR))
          : [];
        const index = Math.max(0, siblings.indexOf(element));

        element.style.setProperty("--motion-delay", `${Math.min(index, 5) * 70}ms`);
        element.classList.add("motion-item");
        observer.observe(element);
      });
    };

    scan();

    const mutations = new MutationObserver(scan);
    mutations.observe(document.getElementById("root"), {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove("has-motion");
      document.querySelectorAll(".motion-item").forEach((element) => {
        element.classList.remove("motion-item", "is-inview");
        element.style.removeProperty("--motion-delay");
      });
    };
  }, [pathname]);

  return null;
}

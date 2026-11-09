/*
 * Admin console theme helper (added with the Settings page).
 *
 * The theme is stored in localStorage and applied as a data attribute on the
 * <html> element. Every dark rule in styles.css is scoped to `.admin-shell`, so
 * the storefront and rider dashboard are never affected.
 */
const STORAGE_KEY = "slicehouse-admin-theme";
const EVENT = "slicehouse:admin-theme";

export const ADMIN_THEMES = [
  {
    id: "warm",
    label: "Warm cream",
    note: "The original pizzeria palette — cream paper and charcoal ink."
  },
  {
    id: "dark",
    label: "Midnight kitchen",
    note: "A darker console for late shifts, with the same tomato accent."
  }
];

export function getAdminTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "warm";
  } catch {
    return "warm";
  }
}

/** Apply the theme without notifying listeners (used on layout mount). */
export function syncAdminTheme(theme = getAdminTheme()) {
  document.documentElement.dataset.adminTheme = theme;
  return theme;
}

/** Save and apply a theme, then notify the settings page/layout. */
export function setAdminTheme(theme) {
  const next = theme === "dark" ? "dark" : "warm";

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage can be blocked — the attribute still applies for this session */
  }

  syncAdminTheme(next);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

/** Subscribe to theme changes; returns an unsubscribe function. */
export function onAdminThemeChange(listener) {
  const handler = (event) => listener(event.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

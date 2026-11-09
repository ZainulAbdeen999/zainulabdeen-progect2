export const ORDER_FLOW = [
  "Order Received",
  "In Kitchen",
  "Sent to Delivery",
  "Delivered"
];

export const SIZE_LABELS = {
  small: "Small · 7\"",
  medium: "Medium · 10\"",
  large: "Large · 13\""
};

export function inr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

export function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function statusTone(status) {
  switch (status) {
    case "Delivered":
      return "success";
    case "Cancelled":
      return "danger";
    case "Sent to Delivery":
      return "info";
    case "In Kitchen":
      return "warning";
    case "Order Received":
      return "accent";
    default:
      return "muted";
  }
}

export function stepIndex(status) {
  return ORDER_FLOW.indexOf(status);
}

export function pluralise(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}

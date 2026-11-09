import { badRequest } from "./ApiError.js";

/** Trim and collapse repeated whitespace. */
export function cleanString(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function requireString(value, label, { min = 1, max = 200 } = {}) {
  const text = cleanString(value);
  if (text.length < min) {
    throw badRequest(`${label} is required`, "VALIDATION_ERROR");
  }
  if (text.length > max) {
    throw badRequest(`${label} must be ${max} characters or fewer`, "VALIDATION_ERROR");
  }
  return text;
}

export function optionalString(value, max = 200) {
  return cleanString(value).slice(0, max);
}

export function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ""));
}

/**
 * Returns an error message, or null when the password is acceptable.
 * Kept deliberately friendly: 8+ characters, one letter and one number.
 */
export function validatePassword(value) {
  const password = String(value ?? "");
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (password.length > 72) return "Password must be 72 characters or fewer";
  if (!/[a-zA-Z]/.test(password)) return "Password must include at least one letter";
  if (!/[0-9]/.test(password)) return "Password must include at least one number";
  return null;
}

export function validateAddress(raw) {
  const address = raw && typeof raw === "object" ? raw : {};

  const fullName = requireString(address.fullName, "Full name", { min: 2, max: 80 });
  const phoneDigits = cleanString(address.phone).replace(/[^\d]/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    throw badRequest("Enter a valid phone number (10–15 digits)", "INVALID_PHONE");
  }

  const pincode = cleanString(address.pincode);
  if (!/^[a-zA-Z0-9 -]{4,10}$/.test(pincode)) {
    throw badRequest("Enter a valid PIN code", "INVALID_PINCODE");
  }

  return {
    fullName,
    phone: phoneDigits,
    line1: requireString(address.line1, "Address line 1", { min: 5, max: 160 }),
    line2: optionalString(address.line2, 160),
    city: requireString(address.city, "City", { min: 2, max: 80 }),
    pincode
  };
}

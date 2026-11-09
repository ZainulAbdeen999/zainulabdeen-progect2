import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });

function bool(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || "development";
const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || "").trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: num(process.env.PORT, 5000),
  clientUrl: (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, ""),
  mongoUri: (process.env.MONGO_URI || "").trim(),
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieSecure: bool(process.env.COOKIE_SECURE, nodeEnv === "production"),
  usingMemoryDb: false,

  admin: {
    name: process.env.ADMIN_NAME || "Slice House Admin",
    email: (process.env.ADMIN_EMAIL || "admin@slicehouse.test").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "Admin@12345"
  },

  razorpay: {
    keyId: razorpayKeyId,
    keySecret: razorpayKeySecret,
    enabled: Boolean(razorpayKeyId && razorpayKeySecret)
  },

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: num(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    get configured() {
      return Boolean(this.host && this.user && this.pass);
    }
  },

  mailFrom: process.env.MAIL_FROM || "Slice House <no-reply@slicehouse.test>",

  lowStockThreshold: num(process.env.LOW_STOCK_THRESHOLD, 20),
  lowStockCron: process.env.LOW_STOCK_CRON || "*/5 * * * *",
  lowStockAlertHours: num(process.env.LOW_STOCK_ALERT_HOURS, 24),

  currency: process.env.CURRENCY || "INR",
  deliveryFee: num(process.env.DELIVERY_FEE, 49),
  freeDeliveryOver: num(process.env.FREE_DELIVERY_OVER, 799),
  taxPercent: num(process.env.TAX_PERCENT, 5)
};

if (!process.env.JWT_SECRET) {
  console.warn(
    "[env] JWT_SECRET is not set — using an insecure development fallback. " +
      "Run `npm run setup` or edit server/.env before deploying."
  );
}

if (!env.razorpay.enabled) {
  console.warn(
    "[env] Razorpay keys are not set — the app will use its built-in demo checkout."
  );
}

if (!env.smtp.configured) {
  console.warn(
    "[env] SMTP is not configured — emails will be written to server/dev-outbox/."
  );
}

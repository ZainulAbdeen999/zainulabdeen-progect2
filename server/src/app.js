import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { attachUser } from "./middleware/auth.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
// Rider dashboard API (added with the rider system).
import riderRoutes from "./routes/rider.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = new Set([
  env.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
]);

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error(`Origin ${origin} is not allowed by CORS`));
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: env.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "https://checkout.razorpay.com"
              ],
              scriptSrcAttr: ["'unsafe-inline'"],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com"
              ],
              fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
              imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
              connectSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://lumberjack.razorpay.com"
              ],
              frameSrc: [
                "https://api.razorpay.com",
                "https://checkout.razorpay.com"
              ]
            }
          }
        : false
    })
  );

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true
    })
  );

  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(attachUser);

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      database: env.usingMemoryDb ? "in-memory" : "external",
      razorpay: env.razorpay.enabled ? "test-mode" : "demo-checkout",
      email: env.smtp.configured ? "smtp" : "dev-outbox"
    });
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/orders", orderRoutes);
  // Rider endpoints live under /api/rider and use their own guard.
  app.use("/api/rider", riderRoutes);
  app.use("/api/admin", adminRoutes);

  // Serve the built React app when it exists (production / single-port demo).
  const clientDist = path.resolve(here, "../../client/dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      return res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

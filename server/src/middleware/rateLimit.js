import rateLimit from "express-rate-limit";

const message = {
  error: {
    message: "Too many attempts. Please wait a few minutes and try again.",
    code: "RATE_LIMITED"
  }
};

/** Tight limit for sign-in, registration and password reset. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message
});

/** Broad limit for the rest of the API. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message
});

import express from "express";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Token } from "../models/Token.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  badRequest,
  conflict,
  forbidden,
  unauthorized
} from "../utils/ApiError.js";
import { createOpaqueToken, hashToken } from "../utils/tokens.js";
import {
  isValidEmail,
  normalizeEmail,
  requireString,
  validatePassword
} from "../utils/validation.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail
} from "../services/mailer.js";
import {
  AUTH_COOKIE,
  cookieOptions,
  requireAuth,
  signToken
} from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const devLink = (url) =>
  !env.isProduction && !env.smtp.configured ? url : undefined;

async function issueToken(user, type, ttlMs) {
  await Token.deleteMany({ user: user._id, type, usedAt: null });
  const raw = createOpaqueToken();
  await Token.create({
    user: user._id,
    type,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMs)
  });
  return raw;
}

async function issueVerification(user) {
  const raw = await issueToken(user, "verify", VERIFY_TTL_MS);
  const url = `${env.clientUrl}/verify-email?token=${raw}`;
  console.log(`[auth] Verification link for ${user.email}: ${url}`);
  await sendVerificationEmail(user, url);
  return url;
}

async function issuePasswordReset(user) {
  const raw = await issueToken(user, "reset", RESET_TTL_MS);
  const url = `${env.clientUrl}/reset-password?token=${raw}`;
  console.log(`[auth] Password reset link for ${user.email}: ${url}`);
  await sendPasswordResetEmail(user, url);
  return url;
}

/* ------------------------------------------------------------------ */
/* Register                                                            */
/* ------------------------------------------------------------------ */
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const name = requireString(req.body?.name, "Name", { min: 2, max: 80 });
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      throw badRequest("Enter a valid email address", "INVALID_EMAIL");
    }

    const passwordError = validatePassword(req.body?.password);
    if (passwordError) throw badRequest(passwordError, "WEAK_PASSWORD");

    const existing = await User.findOne({ email });
    if (existing) {
      throw conflict(
        "An account with this email already exists. Try signing in instead.",
        "EMAIL_IN_USE"
      );
    }

    const passwordHash = await bcrypt.hash(String(req.body.password), 12);
    const user = await User.create({ name, email, passwordHash });

    const verifyUrl = await issueVerification(user);

    res.status(201).json({
      message:
        "Account created. Check your inbox and verify your email before signing in.",
      email: user.email,
      devVerifyUrl: devLink(verifyUrl)
    });
  })
);

/* ------------------------------------------------------------------ */
/* Email verification                                                  */
/* ------------------------------------------------------------------ */
router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const raw = requireString(req.body?.token, "Verification token");
    const token = await Token.findOne({
      tokenHash: hashToken(raw),
      type: "verify",
      usedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!token) {
      throw badRequest(
        "This verification link is invalid or has expired. Request a new one.",
        "INVALID_TOKEN"
      );
    }

    const user = await User.findById(token.user);
    if (!user) {
      throw badRequest("This account no longer exists", "INVALID_TOKEN");
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    token.usedAt = new Date();
    await token.save();
    await Token.deleteMany({ user: user._id, type: "verify", usedAt: null });

    res.json({
      message: "Email verified. You can sign in now.",
      user: user.toSafeJSON()
    });
  })
);

router.post(
  "/resend-verification",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const user = isValidEmail(email) ? await User.findOne({ email }) : null;

    let verifyUrl;
    if (user && !user.emailVerified) {
      verifyUrl = await issueVerification(user);
    }

    res.json({
      message:
        "If that account still needs verification, a fresh link is on its way.",
      devVerifyUrl: verifyUrl ? devLink(verifyUrl) : undefined
    });
  })
);

/* ------------------------------------------------------------------ */
/* Sign in / out                                                       */
/* ------------------------------------------------------------------ */
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email) || !password) {
      throw unauthorized("Email or password is incorrect", "INVALID_CREDENTIALS");
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    const matches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !matches) {
      throw unauthorized("Email or password is incorrect", "INVALID_CREDENTIALS");
    }

    if (!user.emailVerified) {
      throw forbidden(
        "Please verify your email address before signing in. Check your inbox for the link.",
        "EMAIL_NOT_VERIFIED"
      );
    }

    res.cookie(AUTH_COOKIE, signToken(user), cookieOptions());
    res.json({ message: "Signed in", user: user.toSafeJSON() });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ message: "Signed out" });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toSafeJSON() });
  })
);

/* ------------------------------------------------------------------ */
/* Profile (display name + login email / username)                     */
/* ------------------------------------------------------------------ */
router.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Admin Settings lets the signed-in user edit their display name and
    // login email (shown as "username"). The role is never editable here.
    const name = requireString(req.body?.name, "Name", { min: 2, max: 80 });
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      throw badRequest("Enter a valid email address", "INVALID_EMAIL");
    }

    const user = await User.findById(req.user._id);
    if (!user) throw unauthorized("Please sign in to continue", "UNAUTHORIZED");

    // A changed login email must not collide with another account.
    if (email !== user.email) {
      const existing = await User.findOne({
        email,
        _id: { $ne: user._id }
      });
      if (existing) {
        throw conflict(
          "That email is already used by another account",
          "EMAIL_IN_USE"
        );
      }
      user.email = email;
    }

    user.name = name;
    await user.save();

    res.json({ message: "Profile updated", user: user.toSafeJSON() });
  })
);

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */
router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const user = isValidEmail(email) ? await User.findOne({ email }) : null;

    let resetUrl;
    if (user) {
      resetUrl = await issuePasswordReset(user);
    }

    res.json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
      devResetUrl: resetUrl ? devLink(resetUrl) : undefined
    });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const raw = requireString(req.body?.token, "Reset token");
    const passwordError = validatePassword(req.body?.password);
    if (passwordError) throw badRequest(passwordError, "WEAK_PASSWORD");

    const token = await Token.findOne({
      tokenHash: hashToken(raw),
      type: "reset",
      usedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!token) {
      throw badRequest(
        "This reset link is invalid or has expired. Request a new one.",
        "INVALID_TOKEN"
      );
    }

    const user = await User.findById(token.user);
    if (!user) throw badRequest("This account no longer exists", "INVALID_TOKEN");

    user.passwordHash = await bcrypt.hash(String(req.body.password), 12);
    user.passwordChangedAt = new Date();
    await user.save();

    token.usedAt = new Date();
    await token.save();
    await Token.deleteMany({ user: user._id, type: "reset", usedAt: null });

    res.json({
      message: "Password updated. Sign in with your new password."
    });
  })
);

router.post(
  "/change-password",
  // Password changes are rate-limited like sign-in so the current password
  // cannot be brute-forced from a stolen session.
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword) {
      throw badRequest("Enter your current password", "VALIDATION_ERROR");
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) throw badRequest(passwordError, "WEAK_PASSWORD");

    const user = await User.findById(req.user._id).select("+passwordHash");
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw unauthorized("Your current password is incorrect", "INVALID_CREDENTIALS");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    await user.save();

    // Keep this session signed in after invalidating older tokens.
    res.cookie(AUTH_COOKIE, signToken(user), cookieOptions());
    res.json({ message: "Password updated", user: user.toSafeJSON() });
  })
);

export default router;

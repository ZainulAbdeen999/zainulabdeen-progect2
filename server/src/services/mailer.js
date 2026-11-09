import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import {
  verificationEmail,
  passwordResetEmail,
  orderConfirmationEmail,
  lowStockEmail
} from "./templates.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outboxDir = path.resolve(here, "../../dev-outbox");

let transporter = null;

if (env.smtp.configured) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });
}

function slugify(value) {
  return String(value || "mail")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Send an email through SMTP when configured.
 * Otherwise write it to server/dev-outbox/ so the flow can be demoed offline.
 */
export async function sendMail({ to, subject, html, text }) {
  if (transporter) {
    await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      html,
      text
    });
    return { mode: "smtp", delivered: true };
  }

  await fs.mkdir(outboxDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(outboxDir, `${stamp}-${slugify(subject)}.html`);
  const header = `<!-- To: ${to} | Subject: ${subject} -->\n`;
  await fs.writeFile(file, header + html, "utf8");

  console.log(`[mail] SMTP not configured — wrote "${subject}" to ${file}`);

  return { mode: "outbox", delivered: false, file };
}

export async function sendVerificationEmail(user, verifyUrl) {
  const { subject, html, text } = verificationEmail({
    name: user.name,
    verifyUrl
  });
  return sendMail({ to: user.email, subject, html, text });
}

export async function sendPasswordResetEmail(user, resetUrl) {
  const { subject, html, text } = passwordResetEmail({
    name: user.name,
    resetUrl
  });
  return sendMail({ to: user.email, subject, html, text });
}

export async function sendOrderConfirmationEmail(user, order) {
  const { subject, html, text } = orderConfirmationEmail({
    name: user.name,
    order
  });
  return sendMail({ to: user.email, subject, html, text });
}

export async function sendLowStockEmail({ items, recipients }) {
  const { subject, html, text } = lowStockEmail({
    items,
    threshold: env.lowStockThreshold
  });
  return sendMail({
    to: recipients.join(", "),
    subject,
    html,
    text
  });
}

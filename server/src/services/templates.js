const COLORS = {
  tomato: "#d9382b",
  tomatoDark: "#a82a20",
  charcoal: "#241c17",
  cream: "#fff8ee",
  basil: "#3f6b4a",
  gold: "#c9952f",
  line: "#e8ddcd",
  muted: "#6f6257"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout({ title, preheader, body, footerNote = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.cream};font-family:Arial,Helvetica,sans-serif;color:${COLORS.charcoal};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${COLORS.line};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${COLORS.charcoal};padding:22px 28px;">
                <span style="font-size:20px;font-weight:bold;letter-spacing:.5px;color:${COLORS.cream};">
                  Slice<span style="color:${COLORS.gold};">House</span>
                </span>
                <span style="float:right;font-size:12px;letter-spacing:2px;color:#bfae9a;text-transform:uppercase;padding-top:5px;">Pizza &amp; Co.</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;">
                <h1 style="margin:0 0 16px;font-size:23px;line-height:1.3;color:${COLORS.charcoal};">${escapeHtml(title)}</h1>
                <div style="font-size:15px;line-height:1.65;color:#4a3f36;">${body}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 30px;">
                <hr style="border:none;border-top:1px solid ${COLORS.line};margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.muted};">
                  ${footerNote || "You are receiving this email because of activity on your Slice House account."}
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:16px auto 0;font-size:11px;line-height:1.6;color:${COLORS.muted};text-align:center;">
            Slice House · Shop 12, Station Road, Mirpur Khas · Open 11:00 – 23:30
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
  <tr>
    <td style="background:${COLORS.tomato};border-radius:999px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function linkFallback(href) {
  return `<p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.muted};word-break:break-all;">
    Button not working? Copy this link into your browser:<br />
    <a href="${escapeHtml(href)}" style="color:${COLORS.tomatoDark};">${escapeHtml(href)}</a>
  </p>`;
}

export function verificationEmail({ name, verifyUrl }) {
  return {
    subject: "Verify your Slice House email",
    html: layout({
      title: `Welcome to Slice House, ${name.split(" ")[0]}!`,
      preheader: "One click and your first pizza is on its way.",
      body: `
        <p style="margin:0 0 14px;">Thanks for signing up. Confirm your email address so we know this inbox belongs to you.</p>
        ${button(verifyUrl, "Verify my email")}
        <p style="margin:0 0 16px;">This link expires in <strong>24 hours</strong>. If you didn't create an account you can safely ignore this email.</p>
        ${linkFallback(verifyUrl)}
      `
    }),
    text: `Welcome to Slice House, ${name}!\n\nVerify your email (link expires in 24 hours):\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.`
  };
}

export function passwordResetEmail({ name, resetUrl }) {
  return {
    subject: "Reset your Slice House password",
    html: layout({
      title: "Let's get you back in",
      preheader: "Your password reset link is inside.",
      body: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(name.split(" ")[0])}, we received a request to reset the password for your Slice House account.</p>
        ${button(resetUrl, "Choose a new password")}
        <p style="margin:0 0 16px;">This link is valid for <strong>60 minutes</strong> and can be used once. If you didn't ask for this, no action is needed — your password stays the same.</p>
        ${linkFallback(resetUrl)}
      `
    }),
    text: `Hi ${name},\n\nReset your Slice House password (valid for 60 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`
  };
}

export function orderConfirmationEmail({ name, order }) {
  // COD orders have not been paid yet; the rider collects the total on delivery.
  const isCod = order.payment?.method === "cod";
  const otp = order.delivery?.otp;

  const rows = (order.items || [])
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.line};font-size:14px;">
          <strong>${escapeHtml(item.name)}</strong>
          <span style="color:${COLORS.muted};">· ${escapeHtml(item.size)} · ×${item.quantity}</span>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${COLORS.line};font-size:14px;white-space:nowrap;">₹${item.lineTotal}</td>
      </tr>`
    )
    .join("");

  return {
    subject: `Order ${order.orderNumber} confirmed — Slice House`,
    html: layout({
      title: isCod ? "Your COD order is confirmed" : "Your pizza is in the kitchen",
      preheader: `Order ${order.orderNumber} is confirmed.`,
      body: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(name.split(" ")[0])}, ${
          isCod
            ? "your cash-on-delivery order is confirmed. Here is what we are baking:"
            : "payment received. Here is what we are baking:"
        }</p>
        <p style="margin:0 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">Order ${escapeHtml(order.orderNumber)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
          ${rows}
          <tr>
            <td style="padding:8px 0;font-size:14px;color:${COLORS.muted};">Subtotal</td>
            <td align="right" style="padding:8px 0;font-size:14px;">₹${order.subtotal}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:14px;color:${COLORS.muted};">Delivery</td>
            <td align="right" style="padding:4px 0;font-size:14px;">${order.deliveryFee === 0 ? "Free" : `₹${order.deliveryFee}`}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:14px;color:${COLORS.muted};">Tax</td>
            <td align="right" style="padding:4px 0;font-size:14px;">₹${order.tax}</td>
          </tr>
          <tr>
            <td style="padding:10px 0 0;font-size:16px;font-weight:bold;">${
              isCod ? "Total due on delivery" : "Total paid"
            }</td>
            <td align="right" style="padding:10px 0 0;font-size:16px;font-weight:bold;">₹${order.total}</td>
          </tr>
        </table>
        ${
          otp
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:${COLORS.cream};border:1px dashed ${COLORS.gold};border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">Delivery OTP</p>
                    <p style="margin:0 0 4px;font-size:30px;letter-spacing:8px;font-weight:bold;color:${COLORS.charcoal};">${escapeHtml(otp)}</p>
                    <p style="margin:0;font-size:12px;color:${COLORS.muted};">Share this code with your rider only when the order arrives.</p>
                  </td>
                </tr>
              </table>`
            : ""
        }
        <p style="margin:0 0 8px;"><strong>Delivering to</strong><br />
          ${escapeHtml(order.address.fullName)}<br />
          ${escapeHtml(order.address.line1)}${order.address.line2 ? `, ${escapeHtml(order.address.line2)}` : ""}<br />
          ${escapeHtml(order.address.city)} ${escapeHtml(order.address.pincode)}<br />
          ${escapeHtml(order.address.phone)}
        </p>
        <p style="margin:16px 0 0;font-size:14px;">Track your order live from your dashboard — we update the status as it moves from the kitchen to your door.</p>
      `,
      footerNote: "Questions about this order? Reply to this email and we'll help."
    }),
    text: `Order ${order.orderNumber} confirmed.\n\n${order.items
      .map((item) => `${item.quantity} × ${item.name} (${item.size}) — ₹${item.lineTotal}`)
      .join("\n")}\n\nSubtotal: ₹${order.subtotal}\nDelivery: ${order.deliveryFee === 0 ? "Free" : `₹${order.deliveryFee}`}\nTax: ₹${order.tax}\n${
      isCod ? "Total due on delivery" : "Total paid"
    }: ₹${order.total}${otp ? `\n\nDelivery OTP: ${otp}\nShare this code with your rider only when the order arrives.` : ""}`
  };
}

export function lowStockEmail({ items, threshold }) {
  const rows = items
    .map(
      (item) => `<tr>
        <td style="padding:9px 10px;border-bottom:1px solid ${COLORS.line};font-size:13px;text-transform:capitalize;">${escapeHtml(item.name)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid ${COLORS.line};font-size:13px;text-transform:capitalize;color:${COLORS.muted};">${escapeHtml(item.category)}</td>
        <td align="right" style="padding:9px 10px;border-bottom:1px solid ${COLORS.line};font-size:13px;font-weight:bold;color:${item.stock === 0 ? COLORS.tomatoDark : COLORS.charcoal};">${item.stock}</td>
        <td align="right" style="padding:9px 10px;border-bottom:1px solid ${COLORS.line};font-size:13px;color:${COLORS.muted};">${item.threshold}</td>
      </tr>`
    )
    .join("");

  return {
    subject: `Low stock alert — ${items.length} ingredient${items.length === 1 ? "" : "s"} need attention`,
    html: layout({
      title: "Inventory running low",
      preheader: `${items.length} ingredient(s) are at or below the alert threshold.`,
      body: `
        <p style="margin:0 0 16px;">The automated stock check found these items at or below their threshold (default ${threshold}). Restock them from the admin inventory dashboard.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px;">
          <thead>
            <tr style="background:${COLORS.cream};">
              <th align="left" style="padding:8px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">Ingredient</th>
              <th align="left" style="padding:8px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">Category</th>
              <th align="right" style="padding:8px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">Stock</th>
              <th align="right" style="padding:8px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">Threshold</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">This alert is sent at most once every 24 hours per ingredient, unless you run a manual check.</p>
      `,
      footerNote: "Automated message from the Slice House inventory monitor (node-cron)."
    }),
    text: `Low stock alert\n\n${items
      .map((item) => `${item.name} (${item.category}): ${item.stock} left, threshold ${item.threshold}`)
      .join("\n")}`
  };
}

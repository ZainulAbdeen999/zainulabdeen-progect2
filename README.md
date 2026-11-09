# Slice House — Full-Stack Pizza Delivery Platform

**Full-Stack Pizza Delivery Platform · by Zain Tech**

A complete pizza ordering and inventory platform: browse the menu, build your own
pizza, pay online (demo checkout or Razorpay test mode) **or choose cash on
delivery**, track the order and rider live, and manage everything from a staff
dashboard — orders, riders, COD cash, stock, low-stock alerts and the staff
payroll book. Riders get their own mobile-first dashboard, and every delivery is
confirmed with a customer OTP. Delivery is scoped to **Mirpur Khas** in this
build.

**Tech:** React 19 + Vite + React Router · Node.js + Express · MongoDB (Mongoose) ·
JWT auth in httpOnly cookies · bcrypt · Nodemailer · Razorpay (optional).

**Design & build:** [Zain Tech](#design--build-zain-tech)

---

## Design — warm pizzeria, custom-built

The interface is a warm, editorial pizzeria: charcoal ink on cream paper, one
confident tomato accent, basil for success states and a muted gold for the house
details. It is intentionally not a generic food-delivery template — there is no
extra theme layer and no icon font, just one hand-written stylesheet and a custom
SVG set.

| Token | Value | Used for |
|---|---|---|
| Charcoal | `#241C17` / `#2F251E` | Navigation, footer, admin console, dark cards |
| Cream | `#FBF5EA` / `#F3E8D6` | Page surfaces, section bands, soft badges |
| Paper | `#FFFDF8` | Cards and raised panels |
| Tomato | `#D9382B` | Primary actions, active tabs, the brand accent |
| Basil | `#2F6B4F` | Success states, stock labels, confirmation |
| Gold | `#D9A441` | House badges, signature, warm highlights |

**Type:** Fraunces for display headlines and prices, Inter for body copy and UI.

**Icons:** `client/src/components/Icons.jsx` holds a single hand-drawn 24 px
stroke set — cart, wheat, live tracker, stock box, pizza slice, check, arrow, grid,
receipt, layers, bike, phone and home. Every icon inherits `currentColor`, so it
follows the text colour, stays crisp at any size and behaves consistently across
operating systems. There are no emoji anywhere in the interface.

**Photography:** the hero, menu and builder use real Unsplash pizza photography,
cropped to a consistent 4:3 frame with a warm hover zoom. The builder preview uses
an actual Margherita photograph, and the favicon is a matching slice mark.

**Motion:** the interface is deliberately alive without being noisy. The hero
photograph settles, the headline copy rises in sequence, and sections and cards
fade up as they enter the viewport through a shared IntersectionObserver
(`client/src/components/MotionRoot.jsx`). The sticky navigation gains a soft
shadow on scroll, the cart badge pops when it changes, menu and admin cards lift
on hover, the value icons tilt, and the active order step pulses. Once an order is
dispatched, the rider icon travels along the kitchen → door route while the ETA
counts down. Every effect is disabled by `prefers-reduced-motion: reduce`.

Design details worth looking for:

- A split hero with a shaded photograph, a floating “cold-fermented for 24 hours” note and a signature slice logo.
- A three-column value strip with illustrated icon badges instead of emoji.
- Menu cards with full-bleed photography, size chips, live prices and a check-mark add state.
- A dark builder preview panel, an illustrated four-step progress rail and a receipt-style summary.
- A four-step order tracker and an ink-black admin console with illustrated navigation.
- A closing tomato band and footer signature: **Designed & built by Zain Tech**.
- Visible focus rings, `prefers-reduced-motion` support and no horizontal scroll from 320 px up.

---

## Quick start

**Requirements:** Node.js 20 or newer, npm 10+.

```bash
# Run these from inside this project folder (the one containing package.json)
npm install        # also creates server/.env with a random JWT secret
npm run dev        # API on :5000 + web app on :5173
```

Open **http://localhost:5173**.

> **Windows PowerShell note:** if `npm` is blocked with *"running scripts is
> disabled on this system"*, use `npm.cmd install` / `npm.cmd run dev`, or run
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

No MongoDB install is needed. When `MONGO_URI` is empty the server starts an
in-memory MongoDB and seeds the demo catalogue. The first run downloads a MongoDB
binary (~100 MB), so give it a minute. **Data resets every time the server stops.**

### Demo accounts

| Role | Email | Password | Where |
|---|---|---|---|
| Admin / staff | `admin@slicehouse.test` | `Admin@12345` | http://localhost:5173/admin/login |
| Rider | `rider@slicehouse.test` | `Rider@12345` | http://localhost:5173/rider/login |
| Customer | register your own | 8+ chars with a letter and a number | http://localhost:5173/register |

The seeded rider is **Ali Raza** (`03007654321`, plate `MPS-1234`). Admin can create
more riders from **/admin/riders**.

Customer registration requires email verification. In development there is no SMTP,
so the verification link is **printed in the terminal**, shown on the register page
(`devVerifyUrl`), and written to `server/dev-outbox/` as an HTML email.

### Useful scripts (run from the project folder)

| Command | What it does |
|---|---|
| `npm run dev` | Start API + Vite dev server together |
| `npm run dev:server` | API only (`node --watch`) |
| `npm run dev:client` | Vite only |
| `npm run build` | Production build of the React app → `client/dist` |
| `npm start` | Start the Express server (serves `client/dist` if built) |
| `npm run seed` | Seed an empty database |
| `npm run seed:force` | Wipe and reseed the catalogue |

---

## What the app does

### Customer side

| Page | Route | Highlights |
|---|---|---|
| Home | `/` | Hero, kitchen favourites, four-step builder preview, live tracking pitch |
| Menu | `/menu` | 7 seeded pizzas, search by name/ingredient, filters, size picker, add to cart |
| Build your own | `/build` | 4-step builder: base → sauce → cheese → vegetables, live price summary |
| Checkout | `/checkout` | Mirpur Khas delivery address validation, order summary, online or cash-on-delivery payment, cart persisted in `localStorage` |
| Orders | `/orders` | Order history, live status tracker, rider name + phone, ticking ETA, animated kitchen → door route, and the delivery OTP card for active orders |
| Auth | `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password` | Email verification, password reset, protected routes |

### Rider side

| Page | Route | Highlights |
|---|---|---|
| Rider login | `/rider/login` | Separate rider JWT; only active rider accounts can sign in |
| Dashboard | `/rider` | Mobile-first: my assigned orders, claimable order queue, COD cash summary, accept → pick up → collect cash → enter OTP → deliver |

Riders only see a customer's full address and phone **after** they claim or are
assigned an order. The delivery OTP is never sent to the rider — the customer reads
it out on arrival.

### Admin side

| Page | Route | Highlights |
|---|---|---|
| Staff login | `/admin/login` | Separate admin JWT; customer accounts cannot open it |
| Dashboard | `/admin` | Revenue, today's orders, low-stock count, status breakdown, active riders, COD outstanding, recent orders |
| Orders | `/admin/orders` | Filter, advance status, assign/unassign a rider, COD badges, delivery OTP panel, live-tracking editor: Order Received → In Kitchen → Sent to Delivery → Delivered |
| Riders | `/admin/riders` | Create, edit and deactivate riders; active/delivered counts; COD cash in hand and one-click settlement |
| Inventory | `/admin/inventory` | Edit price, stock and availability; low-stock list; manual alert check |
| Staff | `/admin/staff` | Staff records, daily attendance (P/H/A/L), days worked, monthly salary and payments |
| Settings | `/admin/settings` | Theme (warm cream / midnight kitchen) and the admin account — display name, username (email) and password |

---

## Required feature checklist

| Requirement | Where it is implemented |
|---|---|
| Product menu with prices | `client/src/pages/Menu.jsx`, `server/src/routes/menu.js` |
| Custom pizza builder | `client/src/pages/Builder.jsx` + `server/src/services/orderBuilder.js` |
| Cart and checkout | `client/src/context/CartContext.jsx`, `client/src/pages/Checkout.jsx` |
| User registration and login | `client/src/pages/Register.jsx`, `Login.jsx`, `server/src/routes/auth.js` |
| Password security | bcrypt (12 rounds) server-side; JWT in httpOnly cookie |
| Email verification and password reset | `server/src/routes/auth.js` + `server/src/services/mailer.js` |
| Order placement and history | `server/src/routes/orders.js`, `client/src/pages/Orders.jsx` |
| Payment integration | Demo checkout built in; Razorpay test mode when keys are set (`server/src/routes/orders.js`) |
| Live order status | `client/src/components/OrderStatusTracker.jsx` (polls the API) |
| Live delivery tracking | Rider name/phone, ticking ETA and animated route in `OrderStatusTracker.jsx`; admin controls in `AdminOrders.jsx` + `PATCH /api/admin/orders/:id/delivery` |
| Rider accounts and login | `client/src/pages/rider/RiderLogin.jsx`, `server/src/routes/rider.js`, `requireRider` in `server/src/middleware/auth.js` |
| Rider dashboard and order queue | `client/src/pages/rider/RiderDashboard.jsx` — assigned orders, self-claim queue, status actions |
| Admin rider management | `client/src/pages/admin/AdminRiders.jsx`, `/api/admin/riders` CRUD + settle |
| Rider assignment and self-claim | Admin `PATCH /api/admin/orders/:id/assign`; rider `POST /api/rider/orders/:id/claim` / `release` |
| Cash on delivery and settlement | COD option in `Checkout.jsx`; rider `POST /api/rider/orders/:id/cash`; admin settle in `AdminRiders.jsx` |
| OTP-confirmed delivery | 4-digit OTP per order, customer card in `Orders.jsx`, rider verification with a 5-attempt lock and admin reset |
| Admin order management | `client/src/pages/admin/AdminOrders.jsx`, `server/src/routes/admin.js` |
| Inventory management | `client/src/pages/admin/AdminInventory.jsx`, `server/src/models/InventoryItem.js` |
| Admin settings, theme and account | `client/src/pages/admin/AdminSettings.jsx`, `client/src/lib/adminTheme.js`, `PATCH /api/auth/profile`, `POST /api/auth/change-password` |
| Staff attendance and payroll | `client/src/pages/admin/AdminStaff.jsx`; `StaffMember`, `Attendance`, `SalaryPayment` models + `/api/admin/staff` routes |
| Low-stock notification | `server/src/services/lowStock.js` + `node-cron` schedule |
| Responsive UI | `client/src/styles.css` — mobile-first breakpoints, no horizontal scroll from 320 px |
| Motion & accessibility | `client/src/components/MotionRoot.jsx` + CSS keyframes — scroll reveals, hover states and full `prefers-reduced-motion` support |
| Route protection | `client/src/components/ProtectedRoute.jsx` + `server/src/middleware/auth.js` |

---

## How it works

### Prices come from inventory

A pizza is not stored with a fixed price. Its price is the sum of its ingredient
prices from the inventory collection, multiplied by the size factor:

```
small ×1.00 · medium ×1.35 · large ×1.70
```

So changing a base or cheese price in the admin inventory instantly updates every
menu pizza. Orders are rebuilt on the server from **codes only** — the client never
sends prices — so a tampered request cannot change the amount charged. Delivery
(`₹49`, free over `₹799`) and tax (`5%`) are added by the same shared rules in
`server/src/utils/price.js`.

### Stock is reserved on payment

When an order is paid, `applyStockForOrder()` decrements each ingredient (with
MongoDB `$inc` guards so stock cannot go negative). If saving the order fails, the
changes are rolled back. Cancelling an order before it leaves the kitchen restores
the stock, and cancelling after that is blocked.

COD orders have no online payment step, so their stock is reserved as soon as the
order is placed (`paymentMethod: "cod"`). The order is created already confirmed
and appears in the rider queue immediately.

### Live delivery tracking (Mirpur Khas)

Checkout is wired for Mirpur Khas: the city is pre-filled, the PIN placeholder is
`69000`, and the summary states the current delivery area. Once an order reaches
*In Kitchen*, the admin can assign a rider, phone number, note and ETA from
`/admin/orders`. The server stores the ETA as an absolute timestamp in
`order.delivery.etaAt`, so every device shows the same countdown.

On `/orders` the tracker polls every six seconds and renders:

- the rider's name and a `tel:` call button,
- a seconds-accurate ETA corrected against the server clock,
- an animated kitchen → door route that pauses under `prefers-reduced-motion`.

Dispatching an order records `dispatchedAt` and gives it a default 30 minute ETA if
none was set; marking it delivered stores `deliveredAt` and locks the details.

### Rider system, COD and delivery OTP

The rider flow sits on top of the same order document:

```
Order Received ─► (admin assigns or rider claims)
   ─► Accept          (delivery.acceptedAt)
   ─► Picked up       (status = Sent to Delivery, delivery.etaAt set)
   ─► Cash collected  (COD only: payment.status = paid, provider = cod)
   ─► Delivered       (4-digit OTP verified, delivery.otpVerifiedAt)
```

- **Who can see what.** The rider's *Available* tab lists unassigned, paid/COD
  orders with only the city and PIN. The full address and phone are revealed once
  the rider claims the order or the admin assigns it.
- **Assignment.** Admins can pick a rider in `/admin/orders`; riders can also claim
  any unassigned order themselves. Assignment is locked after pickup. A rider can
  release an order before accepting it.
- **Cash on delivery.** COD is available on every order. The order moves through
  the kitchen while `payment.status` stays `pending`. The rider taps **Cash
  collected**, which records `delivery.cashCollectedAt` and marks the payment paid.
  The admin's **/admin/riders** page shows each rider's cash in hand and a
  **Settle** button that records `delivery.cashSettledAt` after handover.
- **OTP proof of delivery.** Every order gets a random 4-digit code at creation.
  The customer sees it on `/orders` and in the confirmation email; it is stripped
  from every rider API response. The rider must type it to mark the order
  delivered. Five wrong attempts lock the order (`delivery.otpLocked`); the admin
  can reset the attempts from the order card. Online orders must be paid before
  they can be delivered; COD orders must have the cash collected first.
- **Status mapping.** Accept sets `delivery.acceptedAt`, pickup sets
  `Sent to Delivery`, and a verified OTP sets `Delivered`.

### Admin settings and staff payroll

The admin console keeps settings and the team on two separate pages.

**`/admin/settings` — settings only**

- **Theme.** *Warm cream* is the default; *Midnight kitchen* is a darker console
  for late shifts. The choice is stored in `localStorage`
  (`slicehouse-admin-theme`) and applied as `data-admin-theme` on `<html>`.
  Every dark rule is scoped to `.admin-shell`, so the storefront and rider app
  never change.
- **Admin account.** Edit the display name and username (login email) through
  `PATCH /api/auth/profile`. The form rejects an email that another account
  already uses. The password form posts to `POST /api/auth/change-password`
  (rate-limited); a successful change re-issues the current cookie, so the admin
  stays signed in while older tokens are invalidated.

**`/admin/staff` — staff only**

Staff records are separate from login accounts, so chefs and cashiers do not
need an account. A Rider record can optionally link a rider login (`userId`).
Attendance is one row per staff member per day (`present`, `half`, `absent`,
`leave`), and payments are one running row per staff member per month:

```
earned   = monthlySalary / daysInMonth × (present + half × 0.5)
balance  = earned − already paid
```

The **Pay** button records the remaining balance (or a smaller amount) and the
server never records more than the earned amount. The page shows staff and
rider counts, present count for the chosen date, monthly payroll, earned,
paid and pending totals. Four demo staff (Ali Raza, Bilal Ahmed, Sana Khan,
Usman Tariq) and the current month's attendance are seeded on first run.

### Auth

- `bcryptjs` hashes passwords with 12 rounds; hashes are never selected by default.
- Login sets a signed JWT in an `httpOnly`, `sameSite=lax` cookie (7 days).
- Email verification and password reset use random opaque tokens; only a SHA-256
  hash of the token is stored, and tokens expire (24 h / 1 h) and are single-use.
- Rate limiters protect register, login, forgot/reset and the whole API.
- Helmet sets security headers; CORS allows only the configured client origins.

### Emails and alerts

With SMTP unset, every email is written to `server/dev-outbox/` as a `.html` file
and the important links are printed in the terminal. A `node-cron` job checks stock
every 5 minutes (`LOW_STOCK_CRON`) and emails an alert when an ingredient is at or
below its threshold, at most once every 24 hours per item.

### Payments

- **Online:** leave `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` empty → built-in
  **demo checkout**. Set them → the server creates a Razorpay order, the browser
  opens Razorpay Checkout, and the server verifies the
  `sha256(order|payment)` signature before marking the order paid.
- **Cash on delivery:** choose COD at checkout. No gateway is involved; the rider
  collects the cash and marks it collected, and the admin settles the handover.

---

## API overview

All routes are under `/api`.

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | Health + which DB/payment/email mode is active |
| GET | `/menu` | public | Pizzas with live prices + inventory options |
| GET | `/menu/options` | public | Bases, sauces, cheeses, vegetables, sizes |
| GET | `/menu/:slug` | public | One pizza |
| POST | `/auth/register` | public | Create account + send verification |
| POST | `/auth/verify-email` | public | Verify with token |
| POST | `/auth/resend-verification` | public | New verification link |
| POST | `/auth/login` | public | Sign in (sets cookie) |
| POST | `/auth/logout` | public | Clear cookie |
| GET | `/auth/me` | customer | Current user |
| POST | `/auth/forgot-password` | public | Send reset link |
| POST | `/auth/reset-password` | public | Set a new password |
| POST | `/auth/change-password` | customer | Change password while signed in |
| PATCH | `/auth/profile` | signed in | Update display name and username (email) |
| POST | `/orders` | customer | Create order (online pending payment, or COD confirmed) |
| POST | `/orders/:id/payment/demo` | customer | Confirm demo payment |
| POST | `/orders/:id/payment/verify` | customer | Verify Razorpay signature |
| GET | `/orders` | customer | List my orders (includes the delivery OTP for active orders) |
| GET | `/orders/:id` | customer | Read one order |
| POST | `/orders/:id/cancel` | customer | Cancel before it leaves the kitchen |
| POST | `/rider/login` | public | Rider login |
| GET | `/rider/orders` | rider | My assigned orders + the claimable queue (address hidden until claimed) |
| POST | `/rider/orders/:id/claim` | rider | Claim an unassigned order |
| POST | `/rider/orders/:id/release` | rider | Release before accepting |
| POST | `/rider/orders/:id/accept` | rider | Accept the assignment |
| POST | `/rider/orders/:id/pickup` | rider | Mark picked up → `Sent to Delivery` |
| POST | `/rider/orders/:id/cash` | rider | Record COD cash collected |
| POST | `/rider/orders/:id/deliver` | rider | Verify the delivery OTP and mark delivered |
| POST | `/admin/login` | public | Staff login |
| GET | `/admin/stats` | admin | Dashboard numbers (incl. active riders, COD outstanding) |
| GET | `/admin/orders` | admin | All orders |
| PATCH | `/admin/orders/:id/status` | admin | Advance/update status |
| PATCH | `/admin/orders/:id/delivery` | admin | Set rider, phone, note and ETA for live tracking |
| PATCH | `/admin/orders/:id/assign` | admin | Assign or unassign a rider |
| POST | `/admin/orders/:id/otp/reset` | admin | Unlock the OTP after five wrong attempts |
| GET | `/admin/riders` | admin | Riders with stats and cash in hand |
| POST | `/admin/riders` | admin | Create a rider |
| PATCH | `/admin/riders/:id` | admin | Edit / activate / deactivate a rider |
| POST | `/admin/riders/:id/settle` | admin | Confirm COD cash handover |
| GET | `/admin/inventory` | admin | All ingredients |
| PATCH | `/admin/inventory/:id` | admin | Price / stock / availability |
| GET | `/admin/low-stock` | admin | Items at or below threshold |
| POST | `/admin/low-stock/check` | admin | Run the alert check now |
| GET | `/admin/menu` | admin | Menu list for availability toggles |
| PATCH | `/admin/menu/:slug` | admin | Toggle a pizza's availability |
| GET | `/admin/staff` | admin | Staff, attendance and salary totals (`?month=YYYY-MM&date=YYYY-MM-DD`) |
| POST | `/admin/staff` | admin | Add a staff member |
| PATCH | `/admin/staff/:id` | admin | Edit / activate / deactivate a staff member |
| POST | `/admin/staff/:id/attendance` | admin | Mark `present`, `half`, `absent` or `leave` for a date |
| POST | `/admin/staff/:id/salary` | admin | Record a monthly salary payment |

Order statuses: `Pending Payment` → `Order Received` → `In Kitchen` →
`Sent to Delivery` → `Delivered`, plus `Cancelled`.

---

## Configuration (`server/.env`)

Created automatically by `npm install`. Never commit it.

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5000` | API port |
| `CLIENT_URL` | `http://localhost:5173` | Used for links + CORS |
| `MONGO_URI` | empty | Empty = in-memory MongoDB |
| `JWT_SECRET` | random on setup | Change in production |
| `JWT_EXPIRES_IN` | `7d` | Cookie lifetime |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@slicehouse.test` / `Admin@12345` | Seeded staff account |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | empty | Empty = demo checkout |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | empty | Empty = dev outbox |
| `LOW_STOCK_THRESHOLD` | `20` | Default alert threshold |
| `LOW_STOCK_CRON` | `*/5 * * * *` | Alert schedule |
| `DELIVERY_FEE` / `FREE_DELIVERY_OVER` / `TAX_PERCENT` | `49` / `799` / `5` | Pricing rules |

---

## Project structure

```
slice-house/
├── package.json                 # workspaces + dev scripts
├── scripts/setup.js             # creates server/.env on first install
├── server/
│   ├── .env.example
│   └── src/
│       ├── index.js             # boot: DB → seed → Express → cron
│       ├── app.js               # middleware, routes, static client
│       ├── seed.js
│       ├── config/              # env + database connection
│       ├── models/              # User, Token, MenuPizza, InventoryItem, Order, StaffMember, Attendance, SalaryPayment
│       ├── routes/              # auth, menu, orders, rider, admin
│       ├── middleware/          # auth (requireUser/requireAdmin/requireRider), errors, rate limits
│       ├── services/            # order builder, inventory, mailer, low stock, templates
│       └── utils/               # price, tokens, validation, errors
└── client/
    ├── index.html
    ├── vite.config.js           # /api proxy → :5000
    └── src/
        ├── App.jsx              # routes (store + rider + admin)
        ├── context/             # Auth + Cart
        ├── lib/                 # axios client, formatting, pricing preview, admin theme
        ├── components/          # Navbar, Footer, PizzaCard, Icons, MotionRoot, tracker, guards
        └── pages/               # Home, Menu, Builder, Checkout, Orders, auth…
            ├── rider/           # RiderLogin, RiderDashboard
            └── admin/           # AdminLogin, layout, dashboard, orders, riders, inventory, staff, settings
```

---

## How to test (end-to-end)

1. `npm install` then `npm run dev`.
2. Open the menu, add a Margherita (Medium), change quantity, open the builder and
   create a custom pizza.
3. Checkout without signing in → redirected to login.
4. Register a customer → copy the verification link from the register screen or the
   terminal → verify → sign in.
5. Complete the delivery address and use the **demo checkout** → order becomes
   *Order Received* and stock drops in the admin inventory.
6. Open `/orders` → tracker shows the current step; try cancelling — allowed while
   the order is still *Order Received*.
7. Sign in at `/admin/login` with the demo admin → advance the order through
   *In Kitchen* → *Sent to Delivery* → *Delivered*; the customer page updates on the
   next poll.
8. While the order is *In Kitchen*, fill the **Live tracking** form (rider name,
   phone, ETA, note) → the customer sees the rider, a ticking countdown and the
   animated route; marking it delivered locks the details.
9. In the admin inventory, set Parmesan stock to `5` → **Check alerts** → a low-stock
   email appears in `server/dev-outbox/`.
10. Change an ingredient price → the customer menu price updates immediately.
11. **Rider flow:** sign in at `/rider/login` as `rider@slicehouse.test` /
    `Rider@12345` → open the *Available* tab and claim the new order → Accept →
    Picked up → Cash collected (COD) → ask the customer for the OTP shown on
    `/orders` → Deliver.
12. **Admin rider flow:** at `/admin/orders` assign an order to Ali Raza, watch the
    OTP panel, and try five wrong OTPs to see the lock; reset it from the panel. At
    `/admin/riders` confirm the cash in hand and press **Settle**.
13. **Settings:** open `/admin/settings` → switch to **Midnight kitchen** (only the
    admin console changes; the storefront stays cream) → edit the display name and
    username, save, then change the admin password and confirm you stay signed in.
14. **Staff & payroll:** open `/admin/staff` → mark attendance with **P / H / A / L**
    → **Add staff** → **Pay** a salary and confirm the balance becomes settled.
15. Resize to 390 px → layout stays usable with no sideways scrolling.

---

## Screenshots

Fresh captures of the warm UI are in [`screenshots/`](screenshots/):

1. `screenshots/home.png` — hero, value strip and signature band
2. `screenshots/menu.png` — menu grid with search and filters
3. `screenshots/builder.png` — builder step with the live summary
4. `screenshots/checkout.png` — Mirpur Khas address form and order summary
5. `screenshots/tracking.png` — live tracker with rider, ETA and route
6. `screenshots/admin-dashboard.png` — stats and recent orders
7. `screenshots/admin-orders.png` — order queue, status controls and live-tracking editor
8. `screenshots/admin-inventory.png` — stock table and low-stock panel
9. `screenshots/mobile-menu.png` — 390 px wide with the navigation open
10. `screenshots/rider-dashboard-mobile.png` — rider dashboard at 390 px with assigned orders, COD badges and tabs
11. `screenshots/rider-dashboard-desktop.png` — the same dashboard on desktop
12. `screenshots/rider-admin-riders.png` — admin riders page with cash in hand and settlement
13. `screenshots/rider-admin-orders.png` — admin order card with rider assignment and the OTP panel
14. `screenshots/rider-checkout-cod.png` — online vs cash-on-delivery selector at checkout
15. `screenshots/rider-customer-otp.png` — customer order with the delivery OTP card
16. `screenshots/rider-customer-otp-mobile.png` — the OTP card at 390 px
17. `screenshots/settings-warm.png` — Settings page: theme and the admin account only
18. `screenshots/settings-dark.png` — the same page in the Midnight kitchen theme
19. `screenshots/settings-mobile.png` — Settings at 390 px
20. `screenshots/staff-warm.png` — Staff page: records, attendance and monthly payroll
21. `screenshots/staff-form.png` — adding a staff member (role, salary, rider link)
22. `screenshots/staff-mobile.png` — Staff page at 390 px

---

## Notes and limitations

- The in-memory database is perfect for a demo but **resets on restart**. Set
  `MONGO_URI` to a local MongoDB or Atlas cluster to keep data.
- Emails are not actually sent unless SMTP is configured — check
  `server/dev-outbox/` during the demo.
- Razorpay needs real test keys; without them the demo checkout intentionally skips
  the gateway so the flow can still be shown.
- `COOKIE_SECURE=false` is only for local HTTP. Use HTTPS and set it to `true` in
  production, along with a strong `JWT_SECRET` and a real database.
- This is a demo project, not a production storefront: no CSRF tokens, no
  payment webhooks, and no image uploads.

---

## Design & build — Zain Tech

Slice House was designed and built by **Zain Tech**. The warm editorial visual
system, the custom SVG icon set, the full-stack implementation, the admin
console and all documentation are original work.

- Storefront credit: footer signature and the closing home-page band.
- Admin console credit: sidebar footer.
- Source: `client/src/styles.css`, `client/src/components/Icons.jsx` and the React/Express app in this folder.

© 2026 Zain Tech. Demo project — not a real restaurant.

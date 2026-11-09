import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { InventoryItem } from "./models/InventoryItem.js";
import { MenuPizza } from "./models/MenuPizza.js";
import { Order } from "./models/Order.js";
import { Token } from "./models/Token.js";
// Staff payroll models (added with the admin Settings page).
import { StaffMember } from "./models/StaffMember.js";
import { Attendance } from "./models/Attendance.js";
import { SalaryPayment } from "./models/SalaryPayment.js";
import { inventorySeed, menuSeed } from "./data/seedData.js";

async function ensureAdmin({ force = false } = {}) {
  const email = env.admin.email;
  const existing = await User.findOne({ email });

  if (!existing) {
    const passwordHash = await bcrypt.hash(env.admin.password, 12);
    await User.create({
      name: env.admin.name,
      email,
      passwordHash,
      role: "admin",
      emailVerified: true,
      emailVerifiedAt: new Date()
    });
    console.log(`[seed] Admin account created: ${email}`);
    return;
  }

  let changed = false;

  if (existing.role !== "admin") {
    existing.role = "admin";
    changed = true;
  }
  if (!existing.emailVerified) {
    existing.emailVerified = true;
    existing.emailVerifiedAt = new Date();
    changed = true;
  }
  if (force) {
    existing.passwordHash = await bcrypt.hash(env.admin.password, 12);
    existing.name = env.admin.name;
    changed = true;
  }

  if (changed) {
    await existing.save();
    console.log(`[seed] Admin account updated: ${email}`);
  }
}

/*
 * Demo rider (added with the rider system).
 * The admin Riders page can create more riders; this one keeps the demo
 * instantly usable after a fresh install or a `--force` reset.
 */
const DEMO_RIDER = {
  name: "Ali Raza",
  email: "rider@slicehouse.test",
  password: "Rider@12345",
  phone: "03007654321",
  vehicle: "MPS-1234"
};

async function ensureRider({ force = false } = {}) {
  const existing = await User.findOne({ email: DEMO_RIDER.email });

  if (!existing) {
    const passwordHash = await bcrypt.hash(DEMO_RIDER.password, 12);
    await User.create({
      name: DEMO_RIDER.name,
      email: DEMO_RIDER.email,
      passwordHash,
      role: "rider",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      riderProfile: {
        phone: DEMO_RIDER.phone,
        vehicle: DEMO_RIDER.vehicle,
        active: true
      }
    });
    console.log(`[seed] Rider account created: ${DEMO_RIDER.email}`);
    return;
  }

  let changed = false;

  if (existing.role !== "rider") {
    existing.role = "rider";
    changed = true;
  }
  if (!existing.emailVerified) {
    existing.emailVerified = true;
    existing.emailVerifiedAt = new Date();
    changed = true;
  }
  if (!existing.riderProfile?.phone) {
    existing.riderProfile.phone = DEMO_RIDER.phone;
    changed = true;
  }
  if (!existing.riderProfile?.vehicle) {
    existing.riderProfile.vehicle = DEMO_RIDER.vehicle;
    changed = true;
  }
  if (force) {
    existing.passwordHash = await bcrypt.hash(DEMO_RIDER.password, 12);
    existing.name = DEMO_RIDER.name;
    existing.riderProfile.active = true;
    changed = true;
  }

  if (changed) {
    await existing.save();
    console.log(`[seed] Rider account updated: ${DEMO_RIDER.email}`);
  }
}

/*
 * Demo staff + attendance (added with the admin Settings / payroll page).
 * Ali Raza is linked to the demo rider login; the rest are independent staff
 * records. Attendance is only seeded when a staff member has none for the
 * current month, so an admin's edits are never overwritten on restart.
 */
const DEMO_STAFF = [
  {
    name: "Ali Raza",
    role: "Rider",
    phone: "03007654321",
    monthlySalary: 35000,
    riderEmail: DEMO_RIDER.email
  },
  { name: "Bilal Ahmed", role: "Chef", phone: "03011223344", monthlySalary: 45000 },
  { name: "Sana Khan", role: "Cashier", phone: "03022334455", monthlySalary: 32000 },
  { name: "Usman Tariq", role: "Waiter", phone: "03033445566", monthlySalary: 28000 }
];

function pad2(value) {
  return String(value).padStart(2, "0");
}

async function ensureStaff({ force = false } = {}) {
  const rider = await User.findOne({ email: DEMO_RIDER.email }).select("_id");
  const today = new Date();
  const month = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
  const joinedAt = new Date(today.getFullYear(), 0, 15);

  for (const member of DEMO_STAFF) {
    const userId = member.riderEmail && rider ? rider._id : null;
    let staff = await StaffMember.findOne({
      name: member.name,
      role: member.role
    });

    if (!staff) {
      staff = await StaffMember.create({
        name: member.name,
        role: member.role,
        phone: member.phone,
        monthlySalary: member.monthlySalary,
        joinedAt,
        active: true,
        userId
      });
      console.log(`[seed] Staff created: ${member.name} (${member.role})`);
    } else if (force) {
      staff.phone = member.phone;
      staff.monthlySalary = member.monthlySalary;
      staff.active = true;
      staff.userId = userId;
      await staff.save();
    }

    // Seed the current month only once so edits survive a restart.
    const existing = await Attendance.countDocuments({
      staff: staff._id,
      dateKey: { $regex: `^${month}-` }
    });

    if (existing === 0) {
      for (let day = 1; day <= today.getDate(); day += 1) {
        const status =
          day % 7 === 0 ? "absent" : day % 11 === 0 ? "half" : "present";
        await Attendance.updateOne(
          { staff: staff._id, dateKey: `${month}-${pad2(day)}` },
          { $setOnInsert: { status } },
          { upsert: true }
        );
      }
    }
  }
}

async function seedInventory({ force = false } = {}) {
  for (const item of inventorySeed) {
    if (force) {
      await InventoryItem.updateOne(
        { code: item.code },
        {
          $set: {
            ...item,
            threshold: item.threshold ?? env.lowStockThreshold,
            available: true
          }
        },
        { upsert: true }
      );
    } else {
      await InventoryItem.updateOne(
        { code: item.code },
        {
          $setOnInsert: {
            ...item,
            threshold: item.threshold ?? env.lowStockThreshold,
            available: true
          }
        },
        { upsert: true }
      );
    }
  }
}

async function seedMenu({ force = false } = {}) {
  for (const pizza of menuSeed) {
    if (force) {
      await MenuPizza.updateOne(
        { slug: pizza.slug },
        { $set: { ...pizza, available: true } },
        { upsert: true }
      );
    } else {
      await MenuPizza.updateOne(
        { slug: pizza.slug },
        { $setOnInsert: { ...pizza, available: true } },
        { upsert: true }
      );
    }
  }
}

/**
 * Load the demo catalogue.
 * `force` wipes users, orders and tokens too, giving a clean demo state.
 */
export async function seedDatabase({ force = false } = {}) {
  if (force) {
    await Promise.all([
      Order.deleteMany({}),
      Token.deleteMany({}),
      User.deleteMany({}),
      InventoryItem.deleteMany({}),
      MenuPizza.deleteMany({}),
      // Payroll data is reset with the rest of the demo database.
      StaffMember.deleteMany({}),
      Attendance.deleteMany({}),
      SalaryPayment.deleteMany({})
    ]);
    console.log("[seed] Cleared users, orders, inventory, menu and payroll");
  }

  await ensureAdmin({ force });
  // Keep the demo rider available after both a normal and a forced seed.
  await ensureRider({ force });
  // Demo staff + this month's attendance for the Settings page.
  await ensureStaff({ force });
  await seedInventory({ force });
  await seedMenu({ force });

  const [users, items, pizzas, orders, staff] = await Promise.all([
    User.countDocuments({}),
    InventoryItem.countDocuments({}),
    MenuPizza.countDocuments({}),
    Order.countDocuments({}),
    StaffMember.countDocuments({})
  ]);

  console.log(
    `[seed] Ready — ${items} inventory items, ${pizzas} menu pizzas, ${users} users, ${staff} staff, ${orders} orders`
  );
}

/** Called on server start so a fresh install is instantly usable. */
export async function seedIfEmpty() {
  const [users, items, pizzas] = await Promise.all([
    User.countDocuments({}),
    InventoryItem.countDocuments({}),
    MenuPizza.countDocuments({})
  ]);

  const empty = users === 0 || items === 0 || pizzas === 0;

  if (empty) {
    console.log("[seed] Empty database detected — loading the demo catalogue");
    await seedDatabase({ force: false });
    return;
  }

  await ensureAdmin({ force: false });
  // Existing databases also get the demo rider on the next server start.
  await ensureRider({ force: false });
  // Existing databases also get the demo staff list on the next server start.
  await ensureStaff({ force: false });
}

/* ------------------------------------------------------------------ */
/* CLI: npm run seed [-- --force]                                      */
/* ------------------------------------------------------------------ */
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const force = process.argv.includes("--force");

  (async () => {
    try {
      await connectDB();
      await seedDatabase({ force });
      console.log(
        `\nDemo admin: ${env.admin.email} / ${env.admin.password}` +
          `\nDemo rider: ${DEMO_RIDER.email} / ${DEMO_RIDER.password}` +
          (force ? "\nAll demo data was reset." : "")
      );
    } catch (error) {
      console.error("[seed] Failed:", error);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}

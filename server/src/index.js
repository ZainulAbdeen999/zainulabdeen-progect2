import cron from "node-cron";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { seedIfEmpty } from "./seed.js";
import { runLowStockCheck } from "./services/lowStock.js";

async function start() {
  await connectDB();
  await seedIfEmpty();

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log("");
    console.log("  Slice House API is running");
    console.log(`  → API:   http://localhost:${env.port}/api`);
    console.log(`  → Web:   ${env.clientUrl}`);
    console.log(`  → Admin: ${env.admin.email} / ${env.admin.password}`);
    console.log(
      `  → Payment: ${env.razorpay.enabled ? "Razorpay test mode" : "built-in demo checkout"}`
    );
    console.log(
      `  → Email:   ${env.smtp.configured ? "SMTP" : "server/dev-outbox/"}`
    );
    console.log("");
  });

  let lowStockJob = null;

  if (cron.validate(env.lowStockCron)) {
    lowStockJob = cron.schedule(env.lowStockCron, () => {
      runLowStockCheck()
        .then((result) => {
          if (result.sent) {
            console.log(
              `[low-stock] Alert sent for ${result.alerted} ingredient(s)`
            );
          }
        })
        .catch((error) => {
          console.error("[low-stock] Scheduled check failed:", error.message);
        });
    });
    console.log(`[cron] Low-stock check scheduled (${env.lowStockCron})`);
  } else {
    console.warn(
      `[cron] LOW_STOCK_CRON "${env.lowStockCron}" is not valid — the job was not scheduled`
    );
  }

  // Run once on boot so the first alert does not wait for the schedule.
  runLowStockCheck()
    .then((result) => {
      if (result.sent) {
        console.log(
          `[low-stock] Startup check alerted on ${result.alerted} ingredient(s)`
        );
      }
    })
    .catch((error) => {
      console.warn("[low-stock] Startup check failed:", error.message);
    });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[server] ${signal} received — shutting down`);

    if (lowStockJob) lowStockJob.stop();

    server.close(async () => {
      try {
        await disconnectDB();
      } catch (error) {
        console.error("[server] Error while closing the database:", error.message);
      }
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 8000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("[server] Unhandled rejection:", reason);
  });
}

start().catch((error) => {
  console.error("[server] Failed to start:", error);
  process.exit(1);
});

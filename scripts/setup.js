#!/usr/bin/env node
/**
 * First-run helper.
 *
 * Creates server/.env from server/.env.example the first time you install,
 * and fills in a strong random JWT secret. Safe to run again — it never
 * overwrites an existing .env file.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const serverDir = path.join(__dirname, "..", "server");
const examplePath = path.join(serverDir, ".env.example");
const envPath = path.join(serverDir, ".env");

if (!fs.existsSync(examplePath)) {
  console.log("[setup] server/.env.example not found — skipping.");
  process.exit(0);
}

if (fs.existsSync(envPath)) {
  console.log("[setup] server/.env already exists — leaving it untouched.");
  process.exit(0);
}

let contents = fs.readFileSync(examplePath, "utf8");

if (contents.includes("replace-with-a-long-random-string")) {
  contents = contents.replace(
    "replace-with-a-long-random-string",
    crypto.randomBytes(48).toString("hex")
  );
}

fs.writeFileSync(envPath, contents, "utf8");

console.log("[setup] Created server/.env with a random JWT secret.");
console.log("[setup] Demo admin login: admin@slicehouse.test / Admin@12345");
console.log("[setup] Start the app with: npm run dev");

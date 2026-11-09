import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";

const here = path.dirname(fileURLToPath(import.meta.url));

let memoryServer = null;

/**
 * Connect to MongoDB.
 *
 * If MONGO_URI is empty we start `mongodb-memory-server`, which runs a real
 * MongoDB binary in a temp folder. That keeps the demo runnable without a
 * local MongoDB install; data resets when the server stops. Set MONGO_URI to
 * use a local server or MongoDB Atlas.
 */
export async function connectDB() {
  let uri = env.mongoUri;

  if (!uri) {
    process.env.MONGOMS_DOWNLOAD_DIR =
      process.env.MONGOMS_DOWNLOAD_DIR ||
      path.resolve(here, "../../.mongo-binaries");

    const { MongoMemoryServer } = await import("mongodb-memory-server");

    console.log(
      "[db] MONGO_URI is empty — starting in-memory MongoDB.\n" +
        "[db] The first run downloads a MongoDB binary (~100 MB) and may take a few minutes."
    );

    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: "slicehouse" }
    });
    uri = memoryServer.getUri();
    env.usingMemoryDb = true;
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });

  const safeUri = uri.replace(/\/\/([^@/]+)@/, "//***@");
  console.log(
    `[db] Connected to ${env.usingMemoryDb ? "in-memory MongoDB" : safeUri}`
  );
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

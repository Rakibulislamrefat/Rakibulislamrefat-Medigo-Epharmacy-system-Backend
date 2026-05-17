import mongoose from "mongoose";
import Session from "../modules/auth/Session.schema";
import Doctor from "../modules/doctor/Doctor.schema";

let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is not defined in .env file");
    }

    if (mongoose.connection.readyState === 1) {
      return;
    }

    if (connectionPromise) {
      await connectionPromise;
      return;
    }

    connectionPromise = mongoose.connect(uri);

    const conn = await connectionPromise;

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Keep indexes aligned with schema and remove legacy ones.
    // This fixes old TTL indexes (e.g., tokenExpiresAt) that can delete
    // sessions after 15 minutes instead of refresh token expiry.
    await Session.syncIndexes();
    console.log("✅ Session indexes synchronized");

    // Remove legacy `user_1` index on doctors collection if present
    try {
      const doctorsColl = conn.connection.db.collection("doctors");
      const existingIndexes = await doctorsColl.indexes();
      const hasUserIndex = existingIndexes.some((ix: any) => ix.name === "user_1");
      if (hasUserIndex) {
        try {
          await doctorsColl.dropIndex("user_1");
          console.log("✅ Dropped legacy index 'user_1' on doctors collection");
        } catch (dropErr) {
          console.warn("⚠️  Could not drop doctors.user_1 index:", dropErr?.message || dropErr);
        }
      }

      // Ensure indexes defined in schema are applied
      await Doctor.syncIndexes();
      console.log("✅ Doctor indexes synchronized");
    } catch (err) {
      console.warn("⚠️  Failed to sync/drop Doctor indexes:", err?.message || err);
    }

    // ── Connection events ──────────────────────────────
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB error: ${err.message}`);
    });

    connectionPromise = null;

  } catch (error: any) {
    connectionPromise = null;
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

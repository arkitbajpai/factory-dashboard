const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set.\n" +
      "1. Copy backend/.env.example to backend/.env\n" +
      "2. Paste your MongoDB Atlas connection string"
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("[MongoDB] Connected to Atlas ✓");
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    process.exit(1);
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected — will retry automatically");
  isConnected = false;
});

mongoose.connection.on("reconnected", () => {
  console.log("[MongoDB] Reconnected ✓");
  isConnected = true;
});

module.exports = { connectDB };

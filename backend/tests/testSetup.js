import "dotenv/config";
import mongoose from "mongoose";

export async function connectTestDatabase() {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error("MONGODB_TEST_URI is missing from backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_TEST_URI);

  console.log("Connected to test database:", mongoose.connection.name);
}

export async function disconnectTestDatabase() {
  await mongoose.disconnect();
}
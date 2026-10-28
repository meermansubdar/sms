
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function seedAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error(
      "Set INITIAL_ADMIN_EMAIL and a password of at least 12 characters in .env."
    );
  }

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "REPLACE_WITH_A_RANDOM_SECRET"
  ) {
    throw new Error("Set a secure JWT_SECRET in .env first.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });

  if (existing) {
    console.log(
      "An account already exists for this email. No changes made."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    name: "School Administrator",
    email,
    passwordHash,
    role: "Administrator",
    status: "Active"
  });

  console.log("Initial administrator created successfully.");
}

seedAdmin()
  .catch((error) => {
    console.error("Administrator setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

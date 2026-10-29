
import { randomUUID } from "node:crypto";
import FeeAssignment from "../models/FeeAssignment.js";

const LOCK_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export async function acquireFeePaymentLock(assignmentId) {
  const lockToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  const assignment = await FeeAssignment.findOneAndUpdate(
    {
      _id: assignmentId,
      status: "Active",
      $or: [
        { "paymentLock.token": null },
        { "paymentLock.token": { $exists: false } },
        { "paymentLock.expiresAt": { $lte: now } },
        { "paymentLock.expiresAt": null },
      ],
    },
    {
      $set: {
        "paymentLock.token": lockToken,
        "paymentLock.expiresAt": expiresAt,
      },
    },
    { new: true }
  );

  if (!assignment) {
    return null;
  }

  return { assignment, lockToken };
}

export async function releaseFeePaymentLock(assignmentId, lockToken) {
  await FeeAssignment.updateOne(
    {
      _id: assignmentId,
      "paymentLock.token": lockToken,
    },
    {
      $set: {
        "paymentLock.token": null,
        "paymentLock.expiresAt": null,
      },
    }
  );
}

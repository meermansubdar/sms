
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "A valid MongoDB ID is required.");

export const createFeePaymentSchema = z.object({
  feeAssignmentId: objectIdSchema,

  installmentId: objectIdSchema,

  amountPaid: z
    .number()
    .finite()
    .positive("Payment amount must be greater than zero.")
    .max(100000000, "Payment amount is too large."),

  paymentDate: z.coerce.date()
  .refine(
    date => !Number.isNaN(date.getTime()),
    "A valid payment date is required."
  )
  .refine(
    date => date <= new Date(),
    "Payment date cannot be in the future."
  )
  .optional(),

  paymentMethod: z.enum([
    "Cash",
    "UPI",
    "Bank Transfer",
    "Cheque",
    "Card",
  ]),

  transactionReference: z
    .string()
    .trim()
    .max(100, "Transaction reference cannot exceed 100 characters.")
    .default(""),

  remarks: z
    .string()
    .trim()
    .max(500, "Remarks cannot exceed 500 characters.")
    .default(""),
});

export const cancelFeePaymentSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(3, "Please provide a cancellation reason.")
    .max(500, "Cancellation reason cannot exceed 500 characters."),
});

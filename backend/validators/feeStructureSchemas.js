
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "A valid MongoDB ID is required");

const feeComponentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Fee component name is required")
    .max(100),
  amount: z
    .number()
    .finite()
    .min(0, "Fee amount cannot be negative"),
});

const installmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Installment name is required")
    .max(100),
  amount: z
    .number()
    .finite()
    .min(0, "Installment amount cannot be negative"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD format")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "Enter a valid calendar date"),
});

const feeStructureFields = {
  name: z.string().trim().min(1).max(150),
  academicYearId: objectIdSchema,
  classId: objectIdSchema,
  currency: z.literal("INR").default("INR"),
  components: z.array(feeComponentSchema).min(1, "Add at least one fee component"),
  installments: z.array(installmentSchema).min(1, "Add at least one installment"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  remarks: z.string().trim().max(500).default(""),
};

function validateFeeTotals(data, ctx) {
  const toPaise = (amount) => Math.round(amount * 100);

  const componentTotal = data.components.reduce(
    (total, component) => total + component.amount,
    0
  );

  const installmentTotal = data.installments.reduce(
    (total, installment) => total + installment.amount,
    0
  );

  if (toPaise(componentTotal) !== toPaise(installmentTotal)) {
    ctx.addIssue({
      code: "custom",
      path: ["installments"],
      message:
        "The total of all installments must equal the total of all fee components.",
    });
  }

  const dueDates = data.installments.map((item) => item.dueDate);

  if (new Set(dueDates).size !== dueDates.length) {
    ctx.addIssue({
      code: "custom",
      path: ["installments"],
      message: "Installment due dates must be different.",
    });
  }
}

export const createFeeStructureSchema = z
  .object(feeStructureFields)
  .superRefine(validateFeeTotals);

export const updateFeeStructureSchema = z
  .object({
    name: feeStructureFields.name.optional(),
    components: feeStructureFields.components.optional(),
    installments: feeStructureFields.installments.optional(),
    remarks: feeStructureFields.remarks.optional(),
  })
  .superRefine((data, ctx) => {
    // Totals can only be compared when both lists are supplied.
    if (data.components && data.installments) {
      validateFeeTotals(data, ctx);
    }
  });

export const updateFeeStructureStatusSchema = z.object({
  status: z.enum(["Active", "Inactive"]),
});

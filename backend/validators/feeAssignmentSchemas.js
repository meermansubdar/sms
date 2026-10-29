
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "A valid MongoDB ID is required");

export const createFeeAssignmentSchema = z
  .object({
    enrollmentId: objectIdSchema,
    feeStructureId: objectIdSchema,
    concessionType: z
      .enum(["None", "Fixed", "Percentage"])
      .default("None"),
    concessionValue: z.number().finite().min(0).default(0),
    remarks: z.string().trim().max(500).default(""),
  })
  .superRefine((data, ctx) => {
    if (data.concessionType === "None" && data.concessionValue !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["concessionValue"],
        message: "Concession value must be zero when concession type is None.",
      });
    }

    if (data.concessionType === "Percentage" && data.concessionValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["concessionValue"],
        message: "Percentage concession cannot exceed 100%.",
      });
    }
  });

export const updateFeeAssignmentStatusSchema = z.object({
  status: z.enum(["Active", "Cancelled"]),
});

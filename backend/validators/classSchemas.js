
import { z } from "zod";

const classNameSchema = z
  .string()
  .trim()
  .regex(/^Class (?:[1-9]|1[0-2])$/, "Use a name from Class 1 to Class 12.");

const gradeNumberSchema = z
  .number()
  .int()
  .min(1, "Grade number must be at least 1.")
  .max(12, "Grade number cannot exceed 12.");

export const createClassSchema = z
  .object({
    name: classNameSchema,
    gradeNumber: gradeNumberSchema
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.name !== `Class ${data.gradeNumber}`) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Class name must match the grade number."
      });
    }
  });

export const updateClassSchema = z
  .object({
    name: classNameSchema.optional(),
    gradeNumber: gradeNumberSchema.optional(),
    status: z.enum(["Active", "Inactive"]).optional()
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update."
  )
  .superRefine((data, ctx) => {
    if (
      data.name !== undefined &&
      data.gradeNumber !== undefined &&
      data.name !== `Class ${data.gradeNumber}`
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Class name must match the grade number."
      });
    }
  });

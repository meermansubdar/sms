
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid MongoDB ID.");

const dateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date.",
  });

const enrollmentStatuses = [
  "Active",
  "Transferred",
  "Completed",
  "Cancelled",
];

export const createEnrollmentSchema = z
  .object({
    studentId: objectIdSchema,
    academicYearId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema,

    rollNumber: z
      .number()
      .int("Roll number must be a whole number.")
      .min(1, "Roll number must be at least 1"),

    enrollmentDate: dateSchema.optional(),

    status: z.enum(enrollmentStatuses).optional(),

    transferDate: dateSchema.nullable().optional(),

    remarks: z
      .string()
      .trim()
      .max(500, "Remarks cannot exceed 500 characters.")
      .optional(),
  })
  .strict();

export const updateEnrollmentSchema = z
  .object({
    rollNumber: z
      .number()
      .int("Roll number must be a whole number.")
      .min(1, "Roll number must be at least 1")
      .optional(),

    enrollmentDate: dateSchema.optional(),

    status: z.enum(enrollmentStatuses).optional(),

    transferDate: dateSchema.nullable().optional(),

    remarks: z
      .string()
      .trim()
      .max(500, "Remarks cannot exceed 500 characters.")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for an update.",
  });

  
export const transferEnrollmentSchema = z
  .object({
    newClassId: objectIdSchema,
    newSectionId: objectIdSchema,

    newRollNumber: z
      .number()
      .int("Roll number must be a whole number.")
      .min(1, "Roll number must be at least 1"),

    transferDate: dateSchema.optional(),
    enrollmentDate: dateSchema.optional(),

    remarks: z
      .string()
      .trim()
      .max(500, "Remarks cannot exceed 500 characters.")
      .optional(),
  })
  .strict();

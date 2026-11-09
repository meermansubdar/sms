
import { z } from "zod";

const userRoles = [
  "Administrator",
  "Principal",
  "Teacher",
  "Student",
  "Parent",
  "Accountant",
];

const studentIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Student ID must be a valid MongoDB ObjectId"
  );

export const createUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254, "Email cannot exceed 254 characters")
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .max(128, "Password cannot exceed 128 characters"),

    role: z.enum(userRoles),

    studentId: studentIdSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.role === "Student" && !data.studentId) {
      ctx.addIssue({
        code: "custom",
        path: ["studentId"],
        message: "Student ID is required for Student accounts.",
      });
    }

    if (data.role !== "Student" && data.studentId) {
      ctx.addIssue({
        code: "custom",
        path: ["studentId"],
        message: "Student ID can only be assigned to Student accounts.",
      });
    }
  });

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254, "Email cannot exceed 254 characters")
      .transform((value) => value.toLowerCase())
      .optional(),

    role: z.enum(userRoles).optional(),

    studentId: studentIdSchema.optional(),

    status: z.enum(["Active", "Inactive"]).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for an update"
  );

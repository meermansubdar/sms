
import { z } from "zod";

const optionalText = (max) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalPhone = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[0-9+() .-]+$/)
  .optional()
  .or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .email()
  .max(254)
  .optional()
  .or(z.literal(""));

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      date < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z")
    );
  }, "Date of birth must be a valid date before today");

export const createStudentSchema = z
  .object({
    admissionNumber: z.string().trim().min(2).max(30),
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    dateOfBirth,
    gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
    email: optionalEmail,
    phone: optionalPhone,
    address: optionalText(500),
    emergencyContactName: optionalText(120),
    emergencyContactPhone: optionalPhone,
  })
  .strict();

export const updateStudentSchema = createStudentSchema
  .omit({ admissionNumber: true })
  .partial()
  .extend({
    status: z.enum(["Active", "Inactive"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });


import { z } from "zod";

const sectionNameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]$/, "Section name must be a single letter from A to Z.")
  .transform((value) => value.toUpperCase());

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Please provide a valid class ID.");

export const createSectionSchema = z
  .object({
    name: sectionNameSchema,
    classId: objectIdSchema,
  })
  .strict();

export const updateSectionSchema = z
  .object({
    name: sectionNameSchema.optional(),
    classId: objectIdSchema.optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update."
  );

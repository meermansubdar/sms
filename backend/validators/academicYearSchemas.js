
import { z } from "zod";

const academicYearFields = {
  name: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Use the format YYYY-YYYY."),

  startDate: z
    .string()
    .date("Use a valid date in YYYY-MM-DD format."),

  endDate: z
    .string()
    .date("Use a valid date in YYYY-MM-DD format."),

  status: z.enum(["Active", "Inactive"])
};

export const createAcademicYearSchema = z
  .object({
    name: academicYearFields.name,
    startDate: academicYearFields.startDate,
    endDate: academicYearFields.endDate
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be later than start date."
      });
    }

    const startYear = data.startDate.slice(0, 4);
    const endYear = data.endDate.slice(0, 4);

    if (data.name !== `${startYear}-${endYear}`) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Name must match the years in the start and end dates."
      });
    }
  });

export const updateAcademicYearSchema = z
  .object({
    name: academicYearFields.name.optional(),
    startDate: academicYearFields.startDate.optional(),
    endDate: academicYearFields.endDate.optional(),
    status: academicYearFields.status.optional()
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update."
  );

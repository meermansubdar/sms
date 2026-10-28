
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid MongoDB ID.");

const dateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date.",
  });

const attendanceStatuses = [
  "Present",
  "Absent",
  "Late",
  "Excused",
];

export const createAttendanceSchema = z
  .object({
    studentId: objectIdSchema,
    enrollmentId: objectIdSchema,
    academicYearId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema,
    date: dateSchema,

    status: z.enum(attendanceStatuses).optional(),

    remarks: z
      .string()
      .trim()
      .max(500, "Remarks cannot exceed 500 characters.")
      .optional(),
  })
  .strict();

export const updateAttendanceSchema = z
  .object({
    status: z.enum(attendanceStatuses).optional(),

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

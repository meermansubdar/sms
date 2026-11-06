
import { z } from "zod";

const periodSchema = z
  .object({
    periodNumber: z.number().int().min(1, "Period number must be at least 1."),

    name: z.string().trim().min(1, "Period name is required."),

    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format."),

    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format."),

    type: z.enum(["Teaching", "Break"])
  })
  .strict();

const periodConfigurationFields = {
  academicYearId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Academic Year ID."),

  workingDays: z
    .array(
      z.enum([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ])
    )
    .min(1, "Select at least one working day."),

  weekdayPeriods: z
    .array(periodSchema)
    .min(1, "At least one weekday period is required."),

  saturdayPeriods: z
    .array(periodSchema)
    .min(1, "At least one Saturday period is required."),

  status: z.enum(["Active", "Inactive"])
};

const validatePeriods = (periods, fieldName, ctx) => {
  const periodNumbers = periods.map((period) => period.periodNumber);

  if (new Set(periodNumbers).size !== periodNumbers.length) {
    ctx.addIssue({
      code: "custom",
      path: [fieldName],
      message: "Period numbers must be unique within a schedule."
    });
  }

  const sortedPeriods = [...periods].sort(
    (a, b) => a.periodNumber - b.periodNumber
  );

  for (let i = 0; i < sortedPeriods.length; i++) {
    const current = sortedPeriods[i];

    const validStartTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(
      current.startTime
    );

    const validEndTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(
      current.endTime
    );

    if (!validStartTime || !validEndTime) {
      continue;
    }

    if (current.startTime >= current.endTime) {
      ctx.addIssue({
        code: "custom",
        path: [fieldName],
        message: "Period end time must be later than start time."
      });
    }

    if (
      i > 0 &&
      sortedPeriods[i - 1].endTime > current.startTime
    ) {
      ctx.addIssue({
        code: "custom",
        path: [fieldName],
        message: "Periods must not overlap."
      });
    }
  }
};

const validateConfiguration = (data, ctx) => {
  if (data.weekdayPeriods) {
    validatePeriods(data.weekdayPeriods, "weekdayPeriods", ctx);
  }

  if (data.saturdayPeriods) {
    validatePeriods(data.saturdayPeriods, "saturdayPeriods", ctx);
  }

  if (data.workingDays) {
    if (new Set(data.workingDays).size !== data.workingDays.length) {
      ctx.addIssue({
        code: "custom",
        path: ["workingDays"],
        message: "Working days must not contain duplicates."
      });
    }
  }
};

export const createPeriodConfigurationSchema = z
  .object({
    academicYearId: periodConfigurationFields.academicYearId,
    workingDays: periodConfigurationFields.workingDays,
    weekdayPeriods: periodConfigurationFields.weekdayPeriods,
    saturdayPeriods: periodConfigurationFields.saturdayPeriods
  })
  .strict()
  .superRefine(validateConfiguration);

export const updatePeriodConfigurationSchema = z
  .object({    
    workingDays: periodConfigurationFields.workingDays.optional(),
    weekdayPeriods: periodConfigurationFields.weekdayPeriods.optional(),
    saturdayPeriods: periodConfigurationFields.saturdayPeriods.optional(),
    status: periodConfigurationFields.status.optional()
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update."
  )
  .superRefine(validateConfiguration);

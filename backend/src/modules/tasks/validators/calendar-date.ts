import { z } from "zod";

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const optionalDueDateSchema = z
  .union([calendarDateSchema, z.null()])
  .optional();

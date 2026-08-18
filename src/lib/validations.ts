import { z } from "zod";

export const canvasTestSchema = z.object({
  token: z.string().min(1).max(512),
  domain: z.string().min(1).max(253),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(256),
  auth: z.string().min(1).max(64),
});

export const pushTestSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export const nudgeTestQuerySchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["productive_window", "12h", "6h", "1h", "overdue"]).default("productive_window"),
});

export const dismissAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
});

export function validateBody<T>(schema: z.ZodType<T>, body: unknown): [T, null] | [null, string] {
  const result = schema.safeParse(body);
  if (result.success) return [result.data, null];
  return [null, result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")];
}

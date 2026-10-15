/**
 * Input schemas of the authentication endpoints.
 */
import { z } from 'zod';

export const loginBodySchema = z.strictObject({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

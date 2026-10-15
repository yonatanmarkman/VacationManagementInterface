/**
 * Input schemas of the user endpoints.
 */
import { z } from 'zod';
import { idStringSchema, paginationShape } from '../../../http/requestParsing';
import { UserRole } from '../domain/UserRole';

export const listUsersQuerySchema = z.strictObject({
  ...paginationShape,
  teamId: idStringSchema.optional(),
  role: z.enum(UserRole).optional(),
});

export type ListUsersQueryParams = z.infer<typeof listUsersQuerySchema>;

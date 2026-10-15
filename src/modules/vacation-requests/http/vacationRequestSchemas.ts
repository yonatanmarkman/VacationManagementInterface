/**
 * Input schemas of the vacation request endpoints.
 *
 * Only shape and format are checked here; business rules (date order, future start,
 * overlaps, ...) live in the domain so they apply to every entry point.
 */
import { z } from 'zod';
import {
  idStringSchema,
  isoDateSchema,
  optionalTextSchema,
  paginationShape,
  versionSchema,
} from '../../../http/requestParsing';
import { VacationRequestStatus } from '../domain/VacationRequestStatus';

export const REASON_MAX_LENGTH = 500;
export const COMMENTS_MAX_LENGTH = 1000;

/** Fields of a request that requesters can never set. */
export const READ_ONLY_FIELDS = ['id', 'userId', 'status', 'comments', 'createdAt', 'updatedAt'];

const sortShape = {
  sortBy: z.enum(['createdAt', 'startDate', 'endDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
};

export const createVacationRequestBodySchema = z.strictObject({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  reason: optionalTextSchema(REASON_MAX_LENGTH),
});

export const updateVacationRequestBodySchema = z
  .strictObject({
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    reason: optionalTextSchema(REASON_MAX_LENGTH),
    version: versionSchema,
  })
  .refine(
    (body) =>
      body.startDate !== undefined || body.endDate !== undefined || body.reason !== undefined,
    { error: 'provide at least one of startDate, endDate or reason' },
  );

export const changeStatusBodySchema = z.strictObject({
  status: z.enum([VacationRequestStatus.Approved, VacationRequestStatus.Rejected], {
    error: 'must be "Approved" or "Rejected"',
  }),
  comments: optionalTextSchema(COMMENTS_MAX_LENGTH),
  version: versionSchema,
});

export const listMyVacationRequestsQuerySchema = z.strictObject({
  ...paginationShape,
  ...sortShape,
  status: z.enum(VacationRequestStatus).optional(),
});

export const listVacationRequestsQuerySchema = z
  .strictObject({
    ...paginationShape,
    ...sortShape,
    status: z.enum(VacationRequestStatus).optional(),
    userId: idStringSchema.optional(),
    teamId: idStringSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, {
    error: 'startDate must be on or before endDate',
    path: ['startDate'],
  });

export type CreateVacationRequestBody = z.infer<typeof createVacationRequestBodySchema>;
export type UpdateVacationRequestBody = z.infer<typeof updateVacationRequestBodySchema>;
export type ChangeStatusBody = z.infer<typeof changeStatusBodySchema>;
export type ListMyVacationRequestsParams = z.infer<typeof listMyVacationRequestsQuerySchema>;
export type ListVacationRequestsParams = z.infer<typeof listVacationRequestsQuerySchema>;

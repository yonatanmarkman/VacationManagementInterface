/**
 * HTTP handlers of the user endpoints (mapped in root.yaml).
 *
 *   GET /users   Validator -> ListUsersQuery
 */
import { getContainer } from '../../../bootstrap/container';
import { parseQuery } from '../../../http/requestParsing';
import { ok } from '../../../http/responses';
import type { HttpHandler, InputParser } from '../../../http/types';
import { ListUsersQuery } from '../application/ListUsersQuery';
import type { ListUsersQueryParams } from './userSchemas';
import { listUsersQuerySchema } from './userSchemas';

export const parseListUsers: InputParser<ListUsersQueryParams> = (event) =>
  parseQuery(event, listUsersQuerySchema);

export const listUsers: HttpHandler<ListUsersQueryParams> = async (params) => {
  const { queryBus } = await getContainer();
  const result = await queryBus.execute(
    new ListUsersQuery({
      filter: { teamId: params.teamId, role: params.role },
      page: { page: params.page, limit: params.limit },
    }),
  );
  return ok(result);
};

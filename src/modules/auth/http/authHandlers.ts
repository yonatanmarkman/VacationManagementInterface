/**
 * HTTP handlers of the authentication endpoints (mapped in root.yaml).
 *
 *   POST /auth/login   public          -> LoginCommand
 *   GET  /auth/me      any logged user -> GetCurrentUserQuery
 */
import { getContainer } from '../../../bootstrap/container';
import { requirePrincipal } from '../../../http/authentication';
import { parseBody } from '../../../http/requestParsing';
import { ok } from '../../../http/responses';
import type { HttpHandler, InputParser } from '../../../http/types';
import { GetCurrentUserQuery } from '../application/GetCurrentUserQuery';
import { LoginCommand } from '../application/LoginCommand';
import type { LoginBody } from './authSchemas';
import { loginBodySchema } from './authSchemas';

export const parseLogin: InputParser<LoginBody> = (event) => parseBody(event, loginBodySchema);

export const login: HttpHandler<LoginBody> = async (body) => {
  const { commandBus } = await getContainer();
  return ok(await commandBus.execute(new LoginCommand(body)));
};

export const getCurrentUser: HttpHandler = async (_input, context) => {
  const principal = requirePrincipal(context);
  const { queryBus } = await getContainer();
  return ok(await queryBus.execute(new GetCurrentUserQuery({ userId: principal.id })));
};

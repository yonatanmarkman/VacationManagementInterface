/**
 * Queries: requests to read data (read side). Query handlers never change state.
 */
import type { Logger } from '../logging/logger';
import { Message, MessageBus } from './MessageBus';
import type { MessageHandler } from './MessageBus';

export abstract class Query<TPayload, TResult> extends Message<TPayload, TResult> {
  declare private readonly __kind?: 'query';
}

export type QueryHandler<TQuery extends Query<unknown, TResult>, TResult> = MessageHandler<
  TQuery,
  TResult
>;

/** Dispatches queries to their registered handlers. */
export class QueryBus extends MessageBus<Query<unknown, unknown>> {
  constructor(logger: Logger) {
    super('query', logger);
  }
}

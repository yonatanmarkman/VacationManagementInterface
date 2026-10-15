/**
 * Commands: requests to change the state of the system (write side).
 *
 * A command is a plain message (e.g. ApproveVacationRequestCommand) handled by
 * exactly one CommandHandler. Handlers enforce business rules, persist changes
 * inside a unit of work and raise domain events.
 */
import type { Logger } from '../logging/logger';
import { Message, MessageBus } from './MessageBus';
import type { MessageHandler } from './MessageBus';

export abstract class Command<TPayload, TResult> extends Message<TPayload, TResult> {
  declare private readonly __kind?: 'command';
}

export type CommandHandler<TCommand extends Command<unknown, TResult>, TResult> = MessageHandler<
  TCommand,
  TResult
>;

/** Dispatches commands to their registered handlers. */
export class CommandBus extends MessageBus<Command<unknown, unknown>> {
  constructor(logger: Logger) {
    super('command', logger);
  }
}

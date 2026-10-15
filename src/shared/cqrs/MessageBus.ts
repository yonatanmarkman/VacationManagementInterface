/**
 * Generic in-process message bus shared by the CommandBus and the QueryBus.
 *
 * Every message class is registered with exactly one handler. Dispatching looks
 * up the handler by the message's class, so callers never depend on handlers directly.
 */
import type { Logger } from '../logging/logger';

/**
 * Base class for commands and queries.
 *
 * `TPayload` is the data carried by the message; `TResult` is what its handler returns.
 * The result type is only tracked at compile time (the `__result` field never exists at runtime).
 */
export abstract class Message<TPayload, TResult> {
  declare readonly __result?: TResult;

  constructor(readonly payload: Readonly<TPayload>) {}
}

/** Handles one message type. */
export interface MessageHandler<TMessage, TResult> {
  execute(message: TMessage): Promise<TResult>;
}

/** Constructor of a message class, used as the registration key. */
export type MessageClass<TMessage> = abstract new (...args: never[]) => TMessage;

export class MessageBus<TBase extends Message<unknown, unknown>> {
  private readonly handlers = new Map<MessageClass<TBase>, MessageHandler<TBase, unknown>>();

  constructor(
    private readonly kind: 'command' | 'query',
    private readonly logger: Logger,
  ) {}

  /** Registers the handler for a message class. Each class can have only one handler. */
  register<TMessage extends TBase, TResult>(
    messageClass: MessageClass<TMessage>,
    handler: MessageHandler<TMessage, TResult>,
  ): this {
    if (this.handlers.has(messageClass)) {
      throw new Error(`A ${this.kind} handler is already registered for ${messageClass.name}`);
    }
    this.handlers.set(messageClass, handler as MessageHandler<TBase, unknown>);
    return this;
  }

  /** Dispatches a message to its handler and returns the handler's result. */
  async execute<TResult>(message: TBase & Message<unknown, TResult>): Promise<TResult> {
    const messageClass = message.constructor as MessageClass<TBase>;
    const handler = this.handlers.get(messageClass);
    if (!handler) {
      throw new Error(`No ${this.kind} handler registered for ${messageClass.name}`);
    }
    const startedAt = performance.now();
    try {
      return (await handler.execute(message)) as TResult;
    } finally {
      this.logger.debug(`${this.kind} executed`, {
        [this.kind]: messageClass.name,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  }
}

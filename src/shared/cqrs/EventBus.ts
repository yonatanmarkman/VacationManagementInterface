/**
 * In-process publish/subscribe bus for domain events.
 *
 * Subscribers react to events (audit log, notifications, ...) without the command
 * handlers knowing about them. A failing subscriber is logged and never fails the
 * request: by the time events are published, the state change is already committed.
 */
import type { Logger } from '../logging/logger';
import type { DomainEvent } from './DomainEvent';

/** Something that reacts to domain events. */
export interface EventSubscriber<TEvent extends DomainEvent = DomainEvent> {
  /** Name used in logs when the subscriber fails. */
  readonly name: string;
  handle(event: TEvent): Promise<void> | void;
}

type EventClass<TEvent extends DomainEvent> = abstract new (...args: never[]) => TEvent;

export class EventBus {
  private readonly subscribersByEvent = new Map<EventClass<DomainEvent>, EventSubscriber[]>();
  private readonly globalSubscribers: EventSubscriber[] = [];

  constructor(private readonly logger: Logger) {}

  /** Subscribes to one event type. */
  subscribe<TEvent extends DomainEvent>(
    eventClass: EventClass<TEvent>,
    subscriber: EventSubscriber<TEvent>,
  ): this {
    const subscribers = this.subscribersByEvent.get(eventClass) ?? [];
    subscribers.push(subscriber as EventSubscriber);
    this.subscribersByEvent.set(eventClass, subscribers);
    return this;
  }

  /** Subscribes to every event (e.g. an audit log). */
  subscribeToAll(subscriber: EventSubscriber): this {
    this.globalSubscribers.push(subscriber);
    return this;
  }

  /** Publishes events in order; the subscribers of one event run concurrently. */
  async publish(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventClass = event.constructor as EventClass<DomainEvent>;
      const subscribers = [
        ...this.globalSubscribers,
        ...(this.subscribersByEvent.get(eventClass) ?? []),
      ];
      const results = await Promise.allSettled(subscribers.map(async (s) => s.handle(event)));
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.error('Event subscriber failed', {
            subscriber: subscribers[index].name,
            event: event.eventName,
            eventId: event.eventId,
            error: result.reason,
          });
        }
      });
    }
  }
}

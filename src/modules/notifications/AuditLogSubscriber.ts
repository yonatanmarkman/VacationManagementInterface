/**
 * Writes every domain event to the structured log (an audit trail of who did what, when).
 */
import type { DomainEvent } from '../../shared/cqrs/DomainEvent';
import type { EventSubscriber } from '../../shared/cqrs/EventBus';
import type { Logger } from '../../shared/logging/logger';

export class AuditLogSubscriber implements EventSubscriber {
  readonly name = 'AuditLogSubscriber';

  constructor(private readonly logger: Logger) {}

  handle(event: DomainEvent): void {
    this.logger.info('domain event', {
      event: event.eventName,
      eventId: event.eventId,
      occurredAt: event.occurredAt.toISOString(),
      payload: event.payload,
    });
  }
}

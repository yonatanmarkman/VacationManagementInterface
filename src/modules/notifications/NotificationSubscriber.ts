/**
 * Simulated notifications. In a real system these handlers would send emails or push
 * messages; here they log what would be sent. They show how new behaviour plugs into the
 * event flow without touching any command handler.
 */
import type { EventBus } from '../../shared/cqrs/EventBus';
import type { Logger } from '../../shared/logging/logger';
import { TeamVacationPlannedEvent } from '../teams/events/TeamVacationPlannedEvent';
import { VacationRequestApprovedEvent } from '../vacation-requests/events/VacationRequestApprovedEvent';
import { VacationRequestCreatedEvent } from '../vacation-requests/events/VacationRequestCreatedEvent';
import { VacationRequestRejectedEvent } from '../vacation-requests/events/VacationRequestRejectedEvent';

export function registerNotificationSubscribers(eventBus: EventBus, logger: Logger): void {
  const notify = (recipient: string, message: string): void =>
    logger.info('notification (simulated)', { recipient, message });

  eventBus
    .subscribe(VacationRequestCreatedEvent, {
      name: 'NotifyValidatorsOfNewRequest',
      handle: ({ payload }) =>
        notify(
          'validators',
          `New vacation request #${payload.requestId} (${payload.startDate} to ${payload.endDate}) awaits review.`,
        ),
    })
    .subscribe(VacationRequestApprovedEvent, {
      name: 'NotifyRequesterOfApproval',
      handle: ({ payload }) =>
        notify(
          `user:${payload.userId}`,
          `Your vacation request #${payload.requestId} was approved.`,
        ),
    })
    .subscribe(VacationRequestRejectedEvent, {
      name: 'NotifyRequesterOfRejection',
      handle: ({ payload }) =>
        notify(
          `user:${payload.userId}`,
          `Your vacation request #${payload.requestId} was rejected: ${payload.comments}`,
        ),
    })
    .subscribe(TeamVacationPlannedEvent, {
      name: 'NotifyTeamPlanParticipants',
      handle: ({ payload }) =>
        payload.participantIds
          .filter((userId) => userId !== payload.proposerId)
          .forEach((userId) =>
            notify(
              `user:${userId}`,
              `User ${payload.proposerId} added you to a team vacation (${payload.startDate} to ${payload.endDate}). Cancel your request if you cannot join.`,
            ),
          ),
    });
}

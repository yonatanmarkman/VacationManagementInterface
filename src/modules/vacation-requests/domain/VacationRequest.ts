/**
 * VacationRequest entity (table `vacation_requests`) and its state transitions.
 *
 * The entity guards its own invariants:
 * - only Pending requests can be rescheduled, cancelled, approved or rejected (rule 4);
 * - nobody can approve or reject their own request (dual-role users);
 * - a rejection must carry a comment (rule 6);
 * - `version` implements optimistic locking: writers must send the version they last saw.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ConflictError, ForbiddenError, ValidationError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { DateRange, IsoDate } from '../../../shared/time/calendarDate';
import { TeamVacationPlan } from '../../teams/domain/TeamVacationPlan';
import { User } from '../../users/domain/User';
import { VacationRequestStatus } from './VacationRequestStatus';

/** Data needed to submit a new request. */
export interface NewVacationRequest {
  readonly userId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly reason: string | null;
  /** Set when the request is part of a team vacation plan. */
  readonly teamPlanId?: number | null;
}

@Entity({ name: 'vacation_requests' })
export class VacationRequest {
  @PrimaryGeneratedColumn('identity', { type: 'integer', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: IsoDate;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: IsoDate;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({
    type: 'enum',
    enum: VacationRequestStatus,
    enumName: 'vacation_request_status',
    default: VacationRequestStatus.Pending,
  })
  status!: VacationRequestStatus;

  /** Validator's comment. Required when the request is rejected. */
  @Column({ type: 'text', nullable: true })
  comments!: string | null;

  /** The team vacation plan this request belongs to, if any. */
  @Column({ name: 'team_plan_id', type: 'integer', nullable: true })
  teamPlanId!: number | null;

  @ManyToOne(() => TeamVacationPlan, { nullable: true })
  @JoinColumn({ name: 'team_plan_id' })
  teamPlan?: TeamVacationPlan | null;

  /** Incremented by TypeORM on every update (optimistic locking). */
  @VersionColumn({ type: 'integer' })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /** Creates a new Pending request. Date rules are checked by the command handler beforehand. */
  static submit(data: NewVacationRequest): VacationRequest {
    const request = new VacationRequest();
    request.userId = data.userId;
    request.startDate = data.startDate;
    request.endDate = data.endDate;
    request.reason = data.reason;
    request.status = VacationRequestStatus.Pending;
    request.comments = null;
    request.teamPlanId = data.teamPlanId ?? null;
    return request;
  }

  get period(): DateRange {
    return { startDate: this.startDate, endDate: this.endDate };
  }

  isOwnedBy(userId: number): boolean {
    return this.userId === userId;
  }

  isPending(): boolean {
    return this.status === VacationRequestStatus.Pending;
  }

  /** Throws unless the request is still Pending (approved/rejected requests are final). */
  assertPending(): void {
    if (!this.isPending()) {
      throw new ConflictError(
        ErrorCode.RequestNotPending,
        `This request is already ${this.status}. ${this.status} requests cannot be modified.`,
        { status: this.status },
      );
    }
  }

  /** Throws if the caller's copy of the request is stale (someone changed it meanwhile). */
  assertVersion(expectedVersion: number): void {
    if (this.version !== expectedVersion) {
      throw new ConflictError(
        ErrorCode.VersionConflict,
        'This request was changed by someone else. Reload it and try again.',
        { expectedVersion, currentVersion: this.version },
      );
    }
  }

  /** Changes the dates and/or reason of a Pending request. */
  reschedule(changes: { period: DateRange; reason: string | null }): void {
    this.assertPending();
    this.startDate = changes.period.startDate;
    this.endDate = changes.period.endDate;
    this.reason = changes.reason;
  }

  /** Approves the request on behalf of a validator. */
  approve(validatorId: number, comments: string | null): void {
    this.assertDecidableBy(validatorId);
    this.status = VacationRequestStatus.Approved;
    this.comments = comments;
  }

  /** Rejects the request on behalf of a validator; a comment is mandatory. */
  reject(validatorId: number, comments: string): void {
    assertRejectionComment(comments);
    this.assertDecidableBy(validatorId);
    this.status = VacationRequestStatus.Rejected;
    this.comments = comments.trim();
  }

  private assertDecidableBy(validatorId: number): void {
    if (this.isOwnedBy(validatorId)) {
      throw new ForbiddenError(
        ErrorCode.SelfDecisionForbidden,
        'You cannot approve or reject your own vacation request.',
      );
    }
    this.assertPending();
  }
}

/** Rule 6: a rejected request must contain a (non-blank) rejection comment. */
export function assertRejectionComment(comments: string | null | undefined): void {
  if (!comments || comments.trim() === '') {
    throw new ValidationError(
      ErrorCode.RejectionCommentRequired,
      'A comment explaining the rejection is required.',
    );
  }
}

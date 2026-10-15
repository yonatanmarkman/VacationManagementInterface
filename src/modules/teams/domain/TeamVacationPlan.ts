/**
 * TeamVacationPlan entity (table `team_vacation_plans`): a vacation proposed by a requester
 * for themselves and teammates.
 *
 * The plan records who proposed what; each participant's own VacationRequest points back to
 * it (`vacation_requests.team_plan_id`) and is still approved or rejected individually.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { IsoDate } from '../../../shared/time/calendarDate';
import { User } from '../../users/domain/User';
import { Team } from './Team';

/** Data needed to record a new plan. */
export interface NewTeamVacationPlan {
  readonly proposerId: number;
  readonly teamId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly reason: string | null;
}

@Entity({ name: 'team_vacation_plans' })
export class TeamVacationPlan {
  @PrimaryGeneratedColumn('identity', { type: 'integer', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ name: 'proposer_id', type: 'integer' })
  proposerId!: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'proposer_id' })
  proposer?: User;

  @Column({ name: 'team_id', type: 'integer' })
  teamId!: number;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({ name: 'team_id' })
  team?: Team;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: IsoDate;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: IsoDate;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  static propose(data: NewTeamVacationPlan): TeamVacationPlan {
    const plan = new TeamVacationPlan();
    Object.assign(plan, data);
    return plan;
  }
}

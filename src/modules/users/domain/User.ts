/**
 * User entity (table `users`).
 *
 * `roles` replaces the single `role` column from the original schema so a user
 * can be both a Requester and a Validator. `password` holds a bcrypt hash and is
 * never loaded unless explicitly selected (login only).
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from '../../teams/domain/Team';
import { UserRole } from './UserRole';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('identity', { type: 'integer', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** Always stored in lower case. */
  @Column({ type: 'varchar', length: 254 })
  email!: string;

  /** bcrypt hash of the password (never the plain text). */
  @Column({ type: 'varchar', length: 100, select: false })
  password!: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role', array: true })
  roles!: UserRole[];

  @Column({ name: 'team_id', type: 'integer' })
  teamId!: number;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({ name: 'team_id' })
  team?: Team;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }
}

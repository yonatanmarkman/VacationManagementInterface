/**
 * Team entity (table `teams`). Every user belongs to exactly one team; teams scope
 * the team calendar and team vacation planning.
 */
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('identity', { type: 'integer', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

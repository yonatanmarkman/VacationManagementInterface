/**
 * Stores team vacation plans and links each participant's request to its plan, so the
 * proposer and the participants can follow how the plan was decided.
 *
 * `team_plan_id` is nullable: individual requests do not belong to a plan. Requests created
 * by team plans before this migration stay unlinked.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamVacationPlans1760600000000 implements MigrationInterface {
  name = 'TeamVacationPlans1760600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE team_vacation_plans (
        id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        proposer_id integer NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        team_id     integer NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
        start_date  date NOT NULL,
        end_date    date NOT NULL,
        reason      text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT team_vacation_plans_dates_check CHECK (end_date >= start_date)
      )`);
    await queryRunner.query(
      `CREATE INDEX team_vacation_plans_proposer_id_idx ON team_vacation_plans (proposer_id)`,
    );

    await queryRunner.query(`
      ALTER TABLE vacation_requests
        ADD COLUMN team_plan_id integer REFERENCES team_vacation_plans (id) ON DELETE RESTRICT`);
    // Partial index: only plan requests are indexed (lookups "requests of these plans").
    await queryRunner.query(
      `CREATE INDEX vacation_requests_team_plan_id_idx ON vacation_requests (team_plan_id)
       WHERE team_plan_id IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE vacation_requests DROP COLUMN team_plan_id`);
    await queryRunner.query(`DROP TABLE team_vacation_plans`);
  }
}

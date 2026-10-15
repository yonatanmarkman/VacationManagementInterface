/**
 * Initial schema: teams, users and vacation_requests.
 *
 * Business rules are also enforced here, as a safety net for concurrent requests:
 * - vacation_requests_no_overlap (EXCLUDE USING gist): a user's Pending/Approved requests
 *   can never overlap, even if two transactions insert at the same moment (rule 2);
 * - vacation_requests_user_dates_unique: the exact same dates cannot be requested twice (rule 3);
 * - CHECK constraints for date order (rule 1) and rejection comments (rule 6).
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { DbConstraint } from '../constraints';

export class InitialSchema1760500000000 implements MigrationInterface {
  name = 'InitialSchema1760500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Lets the GiST exclusion constraint combine "=" on user_id with "&&" on date ranges.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('Requester', 'Validator')`);
    await queryRunner.query(
      `CREATE TYPE vacation_request_status AS ENUM ('Pending', 'Approved', 'Rejected')`,
    );

    await queryRunner.query(`
      CREATE TABLE teams (
        id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name       varchar(100) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT teams_name_unique UNIQUE (name)
      )`);

    await queryRunner.query(`
      CREATE TABLE users (
        id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name       varchar(100) NOT NULL,
        email      varchar(254) NOT NULL,
        password   varchar(100) NOT NULL,
        roles      user_role[] NOT NULL,
        team_id    integer NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_email_unique UNIQUE (email),
        CONSTRAINT users_email_lowercase_check CHECK (email = lower(email)),
        CONSTRAINT users_roles_not_empty_check CHECK (cardinality(roles) > 0)
      )`);
    await queryRunner.query(`CREATE INDEX users_team_id_idx ON users (team_id)`);

    await queryRunner.query(`
      CREATE TABLE vacation_requests (
        id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id    integer NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        start_date date NOT NULL,
        end_date   date NOT NULL,
        reason     text,
        status     vacation_request_status NOT NULL DEFAULT 'Pending',
        comments   text,
        version    integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ${DbConstraint.DatesOrdered} CHECK (end_date >= start_date),
        CONSTRAINT ${DbConstraint.RejectionComment}
          CHECK (status <> 'Rejected' OR (comments IS NOT NULL AND btrim(comments) <> '')),
        CONSTRAINT ${DbConstraint.UniqueUserDates} UNIQUE (user_id, start_date, end_date),
        CONSTRAINT ${DbConstraint.NoOverlap}
          EXCLUDE USING gist (user_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
          WHERE (status IN ('Pending', 'Approved'))
      )`);
    // The unique constraint already indexes (user_id, start_date, ...) for per-user lookups.
    // These two serve the validator dashboard: filter by status + date, default sort by creation.
    await queryRunner.query(
      `CREATE INDEX vacation_requests_status_start_date_idx ON vacation_requests (status, start_date)`,
    );
    await queryRunner.query(
      `CREATE INDEX vacation_requests_created_at_idx ON vacation_requests (created_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE vacation_requests`);
    await queryRunner.query(`DROP TABLE users`);
    await queryRunner.query(`DROP TABLE teams`);
    await queryRunner.query(`DROP TYPE vacation_request_status`);
    await queryRunner.query(`DROP TYPE user_role`);
  }
}

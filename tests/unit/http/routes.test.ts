/**
 * Contract tests for root.yaml: every route is wired to a real handler and declares
 * its security deliberately, so a forgotten `x-roles` cannot silently open a route.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { resolveAccessPolicy } from '../../../src/http/accessPolicy';
import { UserRole } from '../../../src/modules/users/domain/UserRole';

interface Operation {
  'x-handler'?: string;
  'x-inputParser'?: string;
  security?: unknown[];
  'x-roles'?: string[];
}

const spec = load(readFileSync(path.join(__dirname, '../../../src/root.yaml'), 'utf8')) as {
  paths: Record<string, Record<string, Operation>>;
};
const operations = Object.entries(spec.paths).flatMap(([routePath, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({ routePath, method, operation })),
);

function exportOf(ref: string): unknown {
  const [modulePath, exportName] = ref.split('#');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(path.join(__dirname, '../../../src', modulePath))[exportName];
}

describe('root.yaml', () => {
  it.each(operations.map((o) => [`${o.method.toUpperCase()} ${o.routePath}`, o.operation]))(
    '%s points to existing functions',
    (_name, operation) => {
      expect(typeof exportOf(operation['x-handler'] as string)).toBe('function');
      if (operation['x-inputParser']) {
        expect(typeof exportOf(operation['x-inputParser'])).toBe('function');
      }
    },
  );

  it('only exposes login publicly; every other route declares its roles', () => {
    for (const { routePath, operation } of operations) {
      if (routePath === '/auth/login') {
        expect(operation.security).toEqual([]);
      } else if (routePath !== '/auth/me') {
        expect(operation['x-roles']?.length).toBeGreaterThan(0);
      }
    }
    expect(operations).toHaveLength(13);
  });

  it('reserves approval and the dashboard for validators', () => {
    expect(resolveAccessPolicy(spec, '/vacation-requests/:id/status', 'PATCH')).toEqual({
      requiresAuthentication: true,
      roles: [UserRole.Validator],
    });
    expect(resolveAccessPolicy(spec, '/vacation-requests', 'GET').roles).toEqual([
      UserRole.Validator,
    ]);
    expect(resolveAccessPolicy(spec, '/vacation-requests', 'POST').roles).toEqual([
      UserRole.Requester,
    ]);
  });

  it('fails closed when a route has no explicit security', () => {
    expect(resolveAccessPolicy(null, '/anything', 'GET').requiresAuthentication).toBe(true);
    expect(resolveAccessPolicy(spec, '/auth/me', 'GET')).toEqual({
      requiresAuthentication: true,
      roles: [],
    });
    expect(resolveAccessPolicy(spec, '/auth/login', 'POST').requiresAuthentication).toBe(false);
  });
});

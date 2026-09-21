import { describe, expect, it } from 'vitest';

import { decideRoute, type Session } from './route-policy';

const anon: Session = { signedIn: false, hasChosen: false, hasRole: false, activeRole: null };
const chosen: Session = { signedIn: true, hasChosen: true, hasRole: false, activeRole: 'talent' };
const chosenClient: Session = { ...chosen, activeRole: 'client' };
const fresh: Session = { signedIn: true, hasChosen: false, hasRole: false, activeRole: null };
const done: Session = { signedIn: true, hasChosen: true, hasRole: true, activeRole: 'talent' };

describe('signed out', () => {
  it('lets public pages through', () => {
    for (const p of ['/', '/jobs', '/jobs/some-slug', '/talent', '/login', '/signup']) {
      expect(decideRoute(p, anon)).toBeNull();
    }
  });

  it('sends private pages to login, preserving where they were headed', () => {
    expect(decideRoute('/dashboard/talent/matches', anon)).toBe(
      '/login?next=%2Fdashboard%2Ftalent%2Fmatches',
    );
    expect(decideRoute('/dashboard/settings/roles', anon)).toBe(
      '/login?next=%2Fdashboard%2Fsettings%2Froles',
    );
  });
});

describe('the health endpoint', () => {
  // The keep-alive depends on this. If /api/health ever redirects, the ping returns a
  // cheerful 200 from the login page, the database is never touched, and the project
  // pauses anyway — with a green check every three days saying it did not.
  it('is reachable by everyone, in every state', () => {
    for (const session of [anon, fresh, chosen, chosenClient, done]) {
      expect(decideRoute('/api/health', session)).toBeNull();
    }
  });

  it('so are the public browse pages, even mid-onboarding', () => {
    // Browsing is not a privilege earned by finishing a wizard.
    for (const session of [anon, fresh, chosen, done]) {
      expect(decideRoute('/jobs', session)).toBeNull();
      expect(decideRoute('/talent', session)).toBeNull();
      expect(decideRoute('/', session)).toBeNull();
    }
  });
});

describe('signed in, no role chosen', () => {
  it('sends dashboards to role selection', () => {
    expect(decideRoute('/dashboard/client', fresh)).toBe('/select-role');
  });

  it('sends a deep link into onboarding back to role selection', () => {
    expect(decideRoute('/onboarding/talent/basics', fresh)).toBe('/select-role');
  });

  it('lets them reach role selection', () => {
    expect(decideRoute('/select-role', fresh)).toBeNull();
  });
});

describe('mid-onboarding — the redirect loop this file exists to prevent', () => {
  // The shipped bug: /onboarding was gated on has_talent/has_client, which onboarding is
  // what CREATES. Choosing a role bounced straight back to choosing a role.
  it('LETS ONBOARDING THROUGH after a role is chosen', () => {
    expect(decideRoute('/onboarding/talent/basics', chosen)).toBeNull();
    expect(decideRoute('/onboarding/talent/skills', chosen)).toBeNull();
    expect(decideRoute('/onboarding/client/company', chosenClient)).toBeNull();
  });

  it('never returns a target that would itself redirect — no loop is possible', () => {
    const paths = [
      '/select-role',
      '/onboarding/talent/basics',
      '/onboarding/talent/skills',
      '/onboarding/client/company',
      '/dashboard/talent',
      '/dashboard/client',
      '/dashboard/settings/roles',
      '/login',
      '/talent',
      '/jobs',
    ];
    for (const session of [anon, fresh, chosen, chosenClient, done]) {
      for (const path of paths) {
        const first = decideRoute(path, session);
        if (!first) continue;
        const target = first.split('?')[0]!;
        const second = decideRoute(target, session);
        expect(second, `${path} -> ${target} -> ${second}`).toBeNull();
      }
    }
  });

  it('resumes onboarding rather than restarting when a dashboard is requested', () => {
    expect(decideRoute('/dashboard/talent/matches', chosen)).toBe('/onboarding/talent/basics');
    expect(decideRoute('/dashboard/client/jobs', chosenClient)).toBe('/onboarding/client/company');
  });

  it('allows /settings/roles, so a stuck user can change their mind', () => {
    expect(decideRoute('/dashboard/settings/roles', chosen)).toBeNull();
  });
});

describe('fully onboarded', () => {
  it('opens the dashboards', () => {
    expect(decideRoute('/dashboard/talent', done)).toBeNull();
    expect(decideRoute('/dashboard/talent/matches', done)).toBeNull();
  });

  it('moves them off the auth screens', () => {
    expect(decideRoute('/login', done)).toBe('/dashboard/talent');
    expect(decideRoute('/select-role', done)).toBe('/dashboard/talent');
    expect(decideRoute('/login', { ...done, activeRole: 'client' })).toBe('/dashboard/client');
  });

  it('still allows public browsing', () => {
    expect(decideRoute('/jobs', done)).toBeNull();
  });
});

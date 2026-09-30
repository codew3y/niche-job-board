import { describe, expect, it } from 'vitest';

import { decideRoute, type Session } from './route-policy';

const anon: Session = { signedIn: false, hasChosen: false, hasRole: false, activeRole: null };
const chosen: Session = { signedIn: true, hasChosen: true, hasRole: false, activeRole: 'talent' };
const chosenClient: Session = { ...chosen, activeRole: 'client' };
const fresh: Session = { signedIn: true, hasChosen: false, hasRole: false, activeRole: null };
const done: Session = { signedIn: true, hasChosen: true, hasRole: true, activeRole: 'talent' };

describe('signed out', () => {
  it('lets the site pages, the auth screens and the detail pages through', () => {
    for (const p of [
      '/',
      '/for-freelancers',
      '/for-clients',
      '/how-it-works',
      '/about',
      '/login',
      '/signup',
      '/jobs/some-slug',
      '/talent/some-slug',
    ]) {
      expect(decideRoute(p, anon)).toBeNull();
    }
  });

  it('sends private pages to the login, preserving where they were headed', () => {
    expect(decideRoute('/dashboard/talent/matches', anon)).toBe(
      '/login?next=%2Fdashboard%2Ftalent%2Fmatches',
    );
    expect(decideRoute('/dashboard/settings/roles', anon)).toBe(
      '/login?next=%2Fdashboard%2Fsettings%2Froles',
    );
  });

  it('keeps Browse behind sign-in', () => {
    expect(decideRoute('/browse', anon)).toBe('/login?next=%2Fbrowse');
    expect(decideRoute('/dashboard', anon)).toBe('/login?next=%2Fdashboard');
  });

  it('treats the old browse indexes as private — only their children are public', () => {
    // /jobs and /talent redirect to /browse in next.config.ts; if one ever reaches the proxy it
    // must not open browse to a signed-out visitor.
    expect(decideRoute('/jobs', anon)).toBe('/login?next=%2Fjobs');
    expect(decideRoute('/talent', anon)).toBe('/login?next=%2Ftalent');
    expect(decideRoute('/jobs/', anon)).toBe('/login?next=%2Fjobs%2F');
  });
});

describe('the site pages stay readable signed in', () => {
  it('opens For Freelancers, For Clients, How It Works and About in every state', () => {
    for (const session of [fresh, chosen, done]) {
      for (const p of ['/for-freelancers', '/for-clients', '/how-it-works', '/about']) {
        expect(decideRoute(p, session)).toBeNull();
      }
    }
  });
});

describe('the logo and the front door, signed in', () => {
  // The logo points at /dashboard when signed in. Neither it nor a visit to / may ever leave a
  // signed-in user on the landing page.
  it('sends a signed-in visitor on / to their dashboard, by ACTIVE role, in one hop', () => {
    expect(decideRoute('/', done)).toBe('/dashboard/talent');
    expect(decideRoute('/', { ...done, activeRole: 'client' })).toBe('/dashboard/client');
  });

  it('sends an unfinished account on / to wherever it has to go first', () => {
    expect(decideRoute('/', fresh)).toBe('/select-role');
    expect(decideRoute('/', chosen)).toBe('/onboarding/talent/basics');
  });

  it('resolves /dashboard to the active role', () => {
    expect(decideRoute('/dashboard', done)).toBe('/dashboard/talent');
    expect(decideRoute('/dashboard', { ...done, activeRole: 'client' })).toBe('/dashboard/client');
    expect(decideRoute('/dashboard', chosenClient)).toBe('/onboarding/client/company');
  });

  it('opens Browse to anyone fully onboarded, in either role', () => {
    expect(decideRoute('/browse', done)).toBeNull();
    expect(decideRoute('/browse', { ...done, activeRole: 'client' })).toBeNull();
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

  it('so are the job and developer detail pages, in every state', () => {
    // A shared link must open whoever follows it, signed in or not, finished or not.
    for (const session of [anon, fresh, chosen, done]) {
      expect(decideRoute('/jobs/some-slug', session)).toBeNull();
      expect(decideRoute('/talent/some-slug', session)).toBeNull();
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
      '/',
      '/dashboard',
      '/browse',
      '/talent/some-slug',
      '/jobs/some-slug',
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

  it('still opens the public detail pages', () => {
    expect(decideRoute('/jobs/some-slug', done)).toBeNull();
  });

  it('opens the shared inbox for either role', () => {
    // /dashboard/messages is one route for both roles: a conversation belongs to two people,
    // and a per-role inbox would show the same thread twice to anyone holding both roles.
    expect(decideRoute('/dashboard/messages', done)).toBeNull();
    expect(decideRoute('/dashboard/messages/abc', done)).toBeNull();
    expect(decideRoute('/dashboard/messages', { ...done, activeRole: 'client' })).toBeNull();
  });
});

describe('the legal pages', () => {
  // Google's consent screen links straight at these, and everyone following that link is
  // signed out. A redirect here breaks the OAuth consent screen for every new user.
  it('are readable by signed-out visitors', () => {
    expect(decideRoute('/privacy', anon)).toBeNull();
    expect(decideRoute('/terms', anon)).toBeNull();
  });

  it('stay readable mid-onboarding, when someone is most likely to want them', () => {
    for (const session of [fresh, chosen, chosenClient, done]) {
      expect(decideRoute('/privacy', session)).toBeNull();
      expect(decideRoute('/terms', session)).toBeNull();
    }
  });
});

describe('the inbox is private', () => {
  it('sends a signed-out visitor to the login, keeping the thread they wanted', () => {
    expect(decideRoute('/dashboard/messages/abc', anon)).toBe(
      '/login?next=%2Fdashboard%2Fmessages%2Fabc',
    );
  });

  it('is not reachable before a role exists', () => {
    // Messaging needs a client or talent profile on at least one side; landing here
    // mid-onboarding would render an inbox that cannot contain anything.
    expect(decideRoute('/dashboard/messages', fresh)).toBe('/select-role');
    expect(decideRoute('/dashboard/messages', chosen)).toBe('/onboarding/talent/basics');
    expect(decideRoute('/dashboard/messages', chosenClient)).toBe('/onboarding/client/company');
  });
});

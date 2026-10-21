'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { siteUrl } from '@techselect/backend/env';
import { loginInput, signupInput, selectRoleInput } from '@techselect/backend/schemas/auth';
import { safePath } from '@techselect/backend/security/safe-path';
import { createClient } from '@techselect/backend/supabase/server';

/**
 * Auth server actions (Phase 2 §6).
 *
 * Every one follows the same order:
 *   auth check → authz check → validate → act → revalidate
 *
 * Errors come back as a value rather than a thrown exception, because these render inline on
 * a form. A thrown error would lose the user's typed input.
 */

export type ActionResult =
  | {
      ok: true;
      /** The row an action created or updated, when the form needs it next. */
      id?: string;
    }
  | { ok: false; message: string; fields?: Record<string, string[]> };

/** Zod's field errors, flattened into the shape the forms render. */
function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function signUp(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the fields below.', fields: fieldErrors(parsed.error) };
  }

  /**
   * The role the visitor picked before signing up, carried in user metadata.
   *
   * It has to survive a round trip through email confirmation — the user leaves the browser
   * entirely and comes back through a link — so it cannot live in a cookie or a form field.
   * Metadata is client-writable, which is exactly why it is only ever used to choose the NEXT
   * SCREEN. The role itself is created by onboarding under RLS, and `user_profiles` is the
   * authority (backend/src/supabase/middleware.ts says the same thing about not trusting metadata).
   */
  const rawIntent = String(formData.get('intent') ?? '');
  const intent = rawIntent === 'client' || rawIntent === 'talent' ? rawIntent : null;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName, ...(intent ? { intent } : {}) },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    // Supabase does not disclose whether an address is already registered, and neither do we:
    // a distinct "already in use" message turns the signup form into an account-enumeration
    // oracle. The generic path plus the confirmation email is the correct behaviour.
    return { ok: false, message: error.message };
  }

  redirect('/verify');
}

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the fields below.', fields: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately identical for a wrong password and a non-existent account.
    return { ok: false, message: 'That email and password do not match an account.' };
  }

  revalidatePath('/', 'layout');

  const next = safePath(formData.get('next'));
  if (next) redirect(next);

  /**
   * Send them where they belong, rather than to /select-role and letting middleware bounce
   * them onward.
   *
   * It used to redirect to /select-role unconditionally. A returning user with a role would
   * land there, the middleware would see the session and redirect again — an extra hop, and
   * a race: the session cookie is being set by this very response, so the first request can
   * arrive before it is readable and the bounce does not happen at all. That is exactly what
   * an E2E test caught, sitting on /select-role after a successful sign-in.
   *
   * The lookup is cheap and we already have the user.
   */
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('active_role, has_talent, has_client')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (profile?.has_talent || profile?.has_client) {
    redirect(profile.active_role === 'client' ? '/dashboard/client' : '/dashboard/talent');
  }
  // No role yet — either brand new, or abandoned onboarding. /select-role is correct for both.
  redirect('/select-role');
}

/**
 * OAuth start for Google and GitHub (§3, §6).
 *
 * `user:email` is the only GitHub scope requested. This is a sign-in path, not repo access —
 * reading someone's repositories is the v2 scraping question in the portfolio-evidence decision.
 */
export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = formData.get('provider');
  if (provider !== 'google' && provider !== 'github') {
    redirect(`/login?error=${encodeURIComponent('Unknown sign-in provider.')}`);
  }

  const supabase = await createClient();
  const next = safePath(formData.get('next'));
  const callback = new URL('/auth/callback', siteUrl());
  if (next) callback.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback.toString(),
      scopes: provider === 'github' ? 'user:email' : undefined,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(`Could not start ${provider} sign-in. Try again.`)}`,
    );
  }
  redirect(data.url);
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function requestPasswordReset(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { ok: false, message: 'Enter your email address.' };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/reset-password/confirm`,
  });

  // Always the same answer, whether or not the address exists — otherwise this endpoint
  // confirms which emails have accounts.
  return { ok: true };
}

/**
 * Role selection (Phase 2 §6).
 *
 * Creates the `user_profiles` row if missing, then the role-specific profile. The
 * `has_talent` / `has_client` flags are maintained by trigger, not written here — see
 * migration 0001. Writing them from the app would let the two sources of truth drift.
 */
export async function selectRole(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = selectRoleInput.safeParse({ role: formData.get('role') });
  if (!parsed.success) return { ok: false, message: 'Pick one to continue.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'there';

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      { user_id: user.id, display_name: displayName, active_role: parsed.data.role },
      { onConflict: 'user_id' },
    );
  if (profileError) return { ok: false, message: 'Could not save your choice. Try again.' };

  revalidatePath('/', 'layout');
  redirect(
    parsed.data.role === 'client' ? '/onboarding/client/company' : '/onboarding/talent/basics',
  );
}

/** Switch between roles the user already has. Does not create anything. */
export async function switchRole(formData: FormData): Promise<void> {
  const parsed = selectRoleInput.safeParse({ role: formData.get('role') });
  if (!parsed.success) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS restricts this to the caller's own row; the filter is belt-and-braces.
  const { error } = await supabase
    .from('user_profiles')
    .update({ active_role: parsed.data.role })
    .eq('user_id', user.id);
  if (error) redirect(`/?error=${encodeURIComponent('Could not switch role.')}`);

  revalidatePath('/', 'layout');
  redirect(parsed.data.role === 'client' ? '/dashboard/client' : '/dashboard/talent');
}

/**
 * Set or change the password for the signed-in user.
 *
 * Used by the recovery flow and by settings. Called "set" rather than "change" deliberately:
 * an account created through Google or GitHub has NO password, so the same screen has to
 * serve both cases. Failing here, or pretending to send a reset email that can
 * never arrive, is the trap that decision flagged.
 */
export async function updatePassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (password.length < 12) {
    return {
      ok: false,
      message: 'Check the field below.',
      fields: { password: ['Use at least 12 characters. Length beats punctuation.'] },
    };
  }
  if (password !== confirm) {
    return {
      ok: false,
      message: 'Check the field below.',
      fields: { confirmPassword: ['These do not match.'] },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // A recovery link creates a session. No session means the link expired or was never valid.
  if (!user) {
    return {
      ok: false,
      message: 'That reset link has expired. Request a new one.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Add the second role to an existing account (§6).
 *
 * Only creates the `user_profiles` side and switches `active_role`; the role-specific profile
 * is created by its onboarding wizard, which is where the required fields live. The
 * `has_talent` / `has_client` flags are trigger-maintained — writing them here would give
 * two sources of truth for the same fact.
 */
export async function addRole(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = selectRoleInput.safeParse({ role: formData.get('role') });
  if (!parsed.success) return { ok: false, message: 'Unknown role.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('user_profiles')
    .update({ active_role: parsed.data.role })
    .eq('user_id', user.id);
  if (error) return { ok: false, message: 'Could not add that role. Try again.' };

  revalidatePath('/', 'layout');
  redirect(
    parsed.data.role === 'client' ? '/onboarding/client/company' : '/onboarding/talent/basics',
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthCard, OrDivider } from '@/components/auth/auth-card';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { EmailPasswordForm } from '@/components/auth/email-password-form';

export const metadata: Metadata = { title: 'Create an account' };

/**
 * Signup, addressed to ONE audience.
 *
 * `?role=talent|client` comes from the landing page, which asks before it asks for anything
 * else. The previous version hedged — "you'll pick Talent or Client next" — which is the
 * least useful sentence available at the moment someone is deciding whether to commit.
 *
 * The role is a HINT, not a claim. It shapes the copy and preselects the next step; the
 * actual role is created by onboarding, and `/select-role` remains reachable for anyone who
 * arrives without a hint or changes their mind. Nothing here is trusted as authorisation.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const intent = role === 'client' ? 'client' : role === 'talent' ? 'talent' : null;

  const copy = {
    talent: {
      title: 'Find work',
      subtitle:
        'Publish a profile whenever you like. There is no bar to clear, and briefs that fit what you have built come to you.',
    },
    client: {
      title: 'Hire developers',
      subtitle:
        'Post what you need and see ranked candidates with a reason for each. No fees, no middleman.',
    },
  };

  return (
    <AuthCard
      photo="signup"
      title={intent ? copy[intent].title : 'Create an account'}
      subtitle={
        intent
          ? copy[intent].subtitle
          : 'You can do both. Adding the second role later takes a minute.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="prose-link font-medium text-text">
            Sign in
          </Link>
        </>
      }
    >
      {/* Same providers, same order as the sign-in screen: a returning user who forgets
          which method they used must not be nudged into a second account. */}
      <OAuthButtons
        next={
          intent
            ? `/onboarding/${intent === 'client' ? 'client/company' : 'talent/basics'}`
            : undefined
        }
      />
      <OrDivider />
      <EmailPasswordForm mode="signup" intent={intent} />
    </AuthCard>
  );
}

import { buttonStyles } from '@/components/ui/button';
import { signInWithProvider } from '@/lib/actions/auth';

/**
 * Google and GitHub sign-in (§3, §6).
 *
 * Shown ABOVE the email form on both screens, and identical on both. Most returning users
 * cannot remember which method they used; putting the one-click paths first and making the
 * two screens look the same is what stops them creating a second account by accident —
 * which is the failure the identity-linking decision is about.
 */
export function OAuthButtons({ next }: { next?: string }) {
  return (
    <div className="grid gap-2.5">
      {(['google', 'github'] as const).map((provider) => (
        <form key={provider} action={signInWithProvider}>
          <input type="hidden" name="provider" value={provider} />
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className={buttonStyles({ variant: 'secondary', size: 'lg', className: 'w-full' })}
          >
            {provider === 'google' ? <GoogleMark /> : <GitHubMark />}
            Continue with {provider === 'google' ? 'Google' : 'GitHub'}
          </button>
        </form>
      ))}
    </div>
  );
}

/* Brand marks keep their own colours: a Google "G" in the product's accent is not Google's. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-3l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.3 14.2a7.1 7.1 0 0 1 0-4.6V6.5h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.5l4 3.1A7.2 7.2 0 0 1 12 4.8z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

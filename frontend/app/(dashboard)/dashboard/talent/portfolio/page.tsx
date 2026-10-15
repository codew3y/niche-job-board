import { redirect } from 'next/navigation';

/**
 * Projects are edited on the profile page now — one place a profile is edited, reached from
 * "Edit profile" in the profile menu. Kept as a redirect so old links and bookmarks still land.
 */
export default function PortfolioPage(): never {
  redirect('/dashboard/talent/profile#projects');
}

/** The public site's pages, in header order. One list, read by the header, the mobile menu and
 *  the footer, so a page cannot be added to one and forgotten in another. */
export const SITE_NAV = [
  { href: '/', label: 'Home' },
  { href: '/for-freelancers', label: 'For Freelancers' },
  { href: '/for-clients', label: 'For Clients' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/about', label: 'About' },
] as const;

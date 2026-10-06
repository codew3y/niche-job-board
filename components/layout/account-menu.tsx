'use client';

import { Menu } from '@base-ui/react/menu';
import {
  ArrowsLeftRight as ArrowLeftRight,
  SignOut as LogOut,
  PencilSimple as Pencil,
  Gear as Settings,
  User as UserRound,
  Flag,
} from '@phosphor-icons/react/ssr';
import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { ROLE_NAME, type Role } from '@/lib/roles';
import { cn } from '@/lib/ui/cn';

/**
 * The profile menu, opened from the profile picture at the foot of the sidebar. It is the ONLY
 * route to the profile — there is no Profile nav item or header anywhere else.
 *
 * Items: View profile and Edit profile, Settings, the role switch (only when the account holds
 * both roles), Log out.
 *
 * View and Edit are two items only when they are two different pages: a developer's public
 * profile (/talent/<slug>) and its editor, or a client's public company page (/company/<id>)
 * and the company form. Two items that open the same page read as a bug, so if the public page
 * does not exist yet (no slug, no company row) it is one item: "Profile" or "Client profile".
 *
 * The role switch and log-out are server actions, so they stay real <form>s rendered OUTSIDE
 * the menu's portal; the menu items submit them through the `form` attribute. The forms work
 * with JavaScript off; the menu is the enhancement. The active role is persisted on
 * user_profiles by `switchRole`, so the choice survives sign-out and a new device.
 */
export function AccountMenu({
  displayName,
  avatarUrl,
  activeRole,
  hasTalent,
  hasClient,
  profileHref,
  editProfileHref,
  isAdmin = false,
  switchRole,
  signOut,
}: {
  displayName: string;
  avatarUrl: string | null;
  activeRole: Role;
  hasTalent: boolean;
  hasClient: boolean;
  profileHref: string;
  editProfileHref: string;
  /** In ADMIN_EMAILS: show the reports queue. */
  isAdmin?: boolean;
  switchRole: (formData: FormData) => Promise<void>;
  signOut: () => Promise<void>;
}) {
  const other: Role = activeRole === 'talent' ? 'client' : 'talent';
  // Compared without the #fragment: two anchors on one page are still one destination.
  const onePage = profileHref.split('#')[0] === editProfileHref.split('#')[0];
  const hasBoth = hasTalent && hasClient;

  const item =
    'flex w-full cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm text-text outline-none select-none data-highlighted:bg-surface-sunken [&_svg]:size-4 [&_svg]:text-text-subtle';

  return (
    <>
      <form id="account-switch-role" action={switchRole} className="hidden">
        <input type="hidden" name="role" value={other} />
      </form>
      <form id="account-sign-out" action={signOut} className="hidden" />

      <Menu.Root modal={false}>
        <Menu.Trigger
          aria-label={`Profile menu: ${displayName}`}
          className="flex items-center gap-3 rounded-md p-1 text-left outline-offset-2 hover:bg-surface-sunken data-popup-open:bg-surface-sunken lg:w-full lg:px-2 lg:py-2"
        >
          <ProfilePicture name={displayName} src={avatarUrl} />
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-semibold">{displayName}</span>
            <span className="block text-xs text-text-subtle">As {ROLE_NAME[activeRole]}</span>
          </span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            side="top"
            align="start"
            sideOffset={8}
            className="z-overlay outline-none"
          >
            <Menu.Popup
              className={cn(
                'w-60 origin-(--transform-origin) rounded-lg border border-border-base bg-surface-raised p-1 shadow-md outline-none',
                'transition-[opacity] duration-fast ease-out data-ending-style:duration-exit',
                'data-starting-style:opacity-0 data-ending-style:opacity-0',
              )}
            >
              <div className="px-3 pt-2 pb-2">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-text-subtle">Viewing as {ROLE_NAME[activeRole]}</p>
              </div>
              <Menu.Separator className="my-1 h-px bg-border-base" />

              {onePage ? (
                <Menu.LinkItem className={item} render={<Link href={editProfileHref} />}>
                  <UserRound aria-hidden="true" />
                  {activeRole === 'client' ? 'Client profile' : 'Profile'}
                </Menu.LinkItem>
              ) : (
                <>
                  <Menu.LinkItem className={item} render={<Link href={profileHref} />}>
                    <UserRound aria-hidden="true" />
                    View profile
                  </Menu.LinkItem>
                  <Menu.LinkItem className={item} render={<Link href={editProfileHref} />}>
                    <Pencil aria-hidden="true" />
                    Edit profile
                  </Menu.LinkItem>
                </>
              )}
              <Menu.LinkItem className={item} render={<Link href="/dashboard/settings" />}>
                <Settings aria-hidden="true" />
                Settings
              </Menu.LinkItem>
              {isAdmin && (
                <Menu.LinkItem className={item} render={<Link href="/dashboard/admin" />}>
                  <Flag aria-hidden="true" />
                  Reports
                </Menu.LinkItem>
              )}
              {hasBoth && (
                <Menu.Item
                  className={item}
                  render={<button type="submit" form="account-switch-role" />}
                >
                  <ArrowLeftRight aria-hidden="true" />
                  Switch to {ROLE_NAME[other]}
                </Menu.Item>
              )}

              <Menu.Separator className="my-1 h-px bg-border-base" />
              <Menu.Item className={item} render={<button type="submit" form="account-sign-out" />}>
                <LogOut aria-hidden="true" />
                Log out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}

/**
 * The provider photo (Google/GitHub) when there is one, initials otherwise. A plain <img>: a
 * 32px avatar from the provider's CDN gains nothing from the image optimiser, and routing it
 * through one would mean allow-listing every provider host.
 */
function ProfilePicture({ name, src }: { name: string; src: string | null }) {
  if (!src) return <Avatar name={name} size="sm" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the comment above.
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      className="size-8 shrink-0 rounded-full border border-border-base object-cover"
    />
  );
}

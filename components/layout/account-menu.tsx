'use client';

import { Menu } from '@base-ui/react/menu';
import { ArrowLeftRight, LogOut, Plus, Settings } from 'lucide-react';
import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/ui/cn';

const ROLE_NAME = { talent: 'developer', client: 'client' } as const;

/**
 * Account menu: who you are, which side you are on, settings, sign out.
 *
 * These used to sit in the header as loose links and buttons, which at 320px pushed the nav off
 * the row. A menu keeps the header to logo + two icons on a phone.
 *
 * The role switch and sign-out are server actions, so they stay real <form>s rendered OUTSIDE
 * the menu's portal; the menu items submit them through the `form` attribute. The forms work
 * with JavaScript off; the menu is the enhancement.
 *
 * Motion: scales from its trigger (`transform-origin: var(--transform-origin)`), 150ms in,
 * faster out — origin-aware, because a popover that grows from the centre of the screen is not
 * attached to anything (emil-design-eng).
 */
export function AccountMenu({
  displayName,
  activeRole,
  hasTalent,
  hasClient,
  switchRole,
  signOut,
}: {
  displayName: string;
  activeRole: 'talent' | 'client';
  hasTalent: boolean;
  hasClient: boolean;
  switchRole: (formData: FormData) => Promise<void>;
  signOut: () => Promise<void>;
}) {
  const other = activeRole === 'talent' ? 'client' : 'talent';
  const hasBoth = hasTalent && hasClient;

  const item =
    'flex w-full cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text outline-none select-none data-highlighted:bg-surface-sunken [&_svg]:size-4 [&_svg]:text-text-subtle';

  return (
    <>
      <form id="account-switch-role" action={switchRole} className="hidden">
        <input type="hidden" name="role" value={other} />
      </form>
      <form id="account-sign-out" action={signOut} className="hidden" />

      <Menu.Root>
        <Menu.Trigger
          aria-label={`Account: ${displayName}`}
          className="pressable rounded-full outline-offset-2 data-popup-open:ring-2 data-popup-open:ring-border-strong"
        >
          <Avatar name={displayName} size="sm" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={10} align="end" className="z-overlay outline-none">
            <Menu.Popup
              className={cn(
                'w-64 origin-(--transform-origin) rounded-lg border border-border-base bg-surface-raised p-1.5 shadow-md outline-none',
                'transition-[scale,opacity] duration-fast ease-out data-ending-style:duration-exit',
                'data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0',
                'motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100',
              )}
            >
              <div className="px-3 pt-2 pb-3">
                <p className="truncate font-medium">{displayName}</p>
                <p className="text-sm text-text-subtle">Viewing as {ROLE_NAME[activeRole]}</p>
              </div>
              <Menu.Separator className="my-1 h-px bg-border-base" />

              {hasBoth ? (
                <Menu.Item
                  className={item}
                  render={<button type="submit" form="account-switch-role" />}
                >
                  <ArrowLeftRight aria-hidden="true" />
                  Switch to {ROLE_NAME[other]}
                </Menu.Item>
              ) : (
                <Menu.LinkItem className={item} render={<Link href="/dashboard/settings/roles" />}>
                  <Plus aria-hidden="true" />
                  Add a {ROLE_NAME[other]} profile
                </Menu.LinkItem>
              )}
              <Menu.LinkItem className={item} render={<Link href="/dashboard/settings" />}>
                <Settings aria-hidden="true" />
                Settings
              </Menu.LinkItem>

              <Menu.Separator className="my-1 h-px bg-border-base" />
              <Menu.Item className={item} render={<button type="submit" form="account-sign-out" />}>
                <LogOut aria-hidden="true" />
                Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}

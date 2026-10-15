'use client';

import { Drawer } from '@base-ui/react/drawer';
import { X } from '@phosphor-icons/react/ssr';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The one modal surface: a bottom sheet on phones, a centred panel on wider screens.
 *
 * WHY A DRAWER FOR BOTH — base-ui's Drawer extends its Dialog (focus trap, Escape, inert page,
 * scroll lock, focus returned to the trigger) and adds swipe-to-dismiss and virtual-keyboard
 * handling. On a phone a sheet you can flick away is the native pattern (mobile-native); on a
 * laptop the same component is positioned in the centre and the swipe simply goes unused. One
 * component, not two that drift — this replaces three hand-copied native <dialog>s.
 *
 * MOTION (emil-design-eng) —
 *   - Phone: slides up from its own height (`translate: 0 100%`, so it adapts to any content)
 *     on the iOS drawer curve at 280ms; exits faster, scaled by the swipe's velocity so a flick
 *     leaves as quickly as it was thrown.
 *   - Desktop: fades up 8px from scale(0.98). Modals stay centred — `transform-origin: center` —
 *     because unlike a popover, a modal is not anchored to its trigger.
 *   - The swipe drives `transform` while entrances drive the separate `translate`/`scale`
 *     properties, so a drag and an entrance can never fight over one value.
 *   - Reduced motion: opacity only.
 */

/** Everything a Tab key can land on. */
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keep Tab inside the modal.
 *
 * base-ui marks the page behind `aria-hidden` (so screen readers are confined), but in this build
 * its trailing focus guard did not send focus back into the popup: a scripted keyboard pass
 * tabbed from "Send application" straight out to the skip link and the header of a page the user
 * could not see — a WCAG 2.4.3 failure. This wraps Tab at both ends explicitly.
 * It is a guarantee, not a replacement: base-ui still owns Escape, scroll lock, initial focus and
 * returning focus to the trigger. frontend/e2e/keyboard.spec.ts pins the behaviour.
 */
function containTab(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !e.currentTarget.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

type ModalProps = {
  /** The element that opens the modal — composed, so it keeps its own semantics and styles. */
  trigger: ReactElement;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Controlled mode, for flows that close themselves on success. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Width on desktop. */
  size?: 'sm' | 'md';
};

export function Modal({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  size = 'md',
}: ModalProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Trigger render={trigger} />
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop
            className={cn(
              'fixed inset-0 z-overlay min-h-dvh bg-backdrop backdrop-blur-[2px]',
              'opacity-[calc(1-var(--drawer-swipe-progress,0))]',
              'transition-opacity duration-moderate ease-drawer data-swiping:duration-0',
              'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-exit',
            )}
          />
          <Drawer.Viewport className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-6">
            <Drawer.Popup
              onKeyDown={containTab}
              className={cn(
                'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface-raised text-text shadow-lg outline-none',
                // Phone: a sheet, rounded on top, padded for the home indicator.
                'rounded-t-2xl border-t border-border-base pb-[env(safe-area-inset-bottom,0px)]',
                // Desktop: a panel.
                'sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:rounded-lg sm:border sm:pb-0',
                size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl',
                // The swipe owns `transform`; entrances use `translate`/`scale`.
                '[transform:translateY(var(--drawer-swipe-movement-y,0px))] data-swiping:select-none',
                'transition-[translate,scale,opacity,transform] duration-moderate ease-drawer',
                'data-starting-style:translate-y-full data-ending-style:translate-y-full',
                'data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--duration-exit))]',
                'sm:data-starting-style:translate-y-2 sm:data-starting-style:scale-[0.98] sm:data-starting-style:opacity-0',
                'sm:data-ending-style:translate-y-2 sm:data-ending-style:scale-[0.98] sm:data-ending-style:opacity-0',
                'sm:ease-out sm:data-ending-style:duration-exit',
                // Reduced motion: no travel, just the fade.
                'motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-y-0',
                'motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0',
                'motion-reduce:sm:data-starting-style:scale-100 motion-reduce:sm:data-ending-style:scale-100',
              )}
            >
              {/* The grab handle — the affordance that says "this can be flicked away". */}
              <div aria-hidden="true" className="flex justify-center pt-2.5 sm:hidden">
                <span className="h-1 w-10 rounded-full bg-border-strong" />
              </div>

              <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-4 sm:px-6 sm:pt-6">
                <div className="min-w-0">
                  <Drawer.Title className="font-semibold text-2xl leading-tight">
                    {title}
                  </Drawer.Title>
                  {description && (
                    <Drawer.Description className="mt-1 text-sm text-text-muted text-pretty">
                      {description}
                    </Drawer.Description>
                  )}
                </div>
                {/* A visible close control: required for touch screen readers to leave a modal
                    (base-ui docs), and faster than hunting for the backdrop on desktop. */}
                <Drawer.Close
                  aria-label="Close"
                  className="pressable -mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-md text-text-subtle hover:bg-surface-sunken hover:text-text"
                >
                  <X aria-hidden="true" size={18} />
                </Drawer.Close>
              </div>

              <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
                {children}
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}

/** Closes the enclosing modal. Render prop so it can be any button. */
export function ModalClose({ render }: { render: ReactElement }) {
  return <Drawer.Close render={render} />;
}

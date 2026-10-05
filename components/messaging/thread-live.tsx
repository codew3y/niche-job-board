'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { markConversationRead } from '@/lib/actions/messaging';

/** How often an open conversation or inbox checks for new messages while it is on screen. */
const REFRESH_MS = 10_000;

/**
 * Keeps an open conversation (or the inbox) current, with no visible UI.
 *
 *   - Marks the conversation read once it is actually on screen. Not during render: link
 *     prefetch and the back/forward cache render pages nobody looked at, which would clear the
 *     unread badge (and the "one email per unread stretch" rule) for a thread never seen.
 *   - Refreshes the server-rendered page every 10 seconds while the tab is visible, and at once
 *     when the tab becomes visible again, so a reply appears without a reload. Polling stops in
 *     a background tab: no requests for a page nobody is reading.
 *
 * Polling rather than a realtime socket: one small request per open tab every 10 seconds, and the
 * page is rendered by the same RLS-checked server code as a normal visit, so there is no second
 * path to the messages to secure.
 */
export function ThreadLive({
  conversationId,
  hasUnread = false,
}: {
  conversationId?: string;
  hasUnread?: boolean;
}) {
  const router = useRouter();
  const marking = useRef(false);

  useEffect(() => {
    const markIfSeen = () => {
      if (!conversationId || !hasUnread || marking.current) return;
      if (document.visibilityState !== 'visible') return;
      marking.current = true;
      void markConversationRead(conversationId).then(() => {
        marking.current = false;
        router.refresh();
      });
    };
    markIfSeen();

    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      router.refresh();
      markIfSeen();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [conversationId, hasUnread, router]);

  return null;
}

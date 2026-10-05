'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { markAllNotificationsRead } from '@/lib/actions/notifications';

/**
 * Marks notifications read once the list is actually on screen (not on render: prefetch renders
 * pages nobody looked at). The list keeps its "New" labels for this visit; the nav badge clears.
 */
export function MarkNotificationsSeen({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (!hasUnread || done.current || document.visibilityState !== 'visible') return;
    done.current = true;
    void markAllNotificationsRead().then(() => router.refresh());
  }, [hasUnread, router]);
  return null;
}

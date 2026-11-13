import type { Level } from '../types';
import { KEYS, readJSON } from './storage';
import { pendingBacklogCount } from './backlog';

let timer: number | undefined;

/** Schedule the next 9 PM reminder (only fires if there are pending backlogs). Safe to call repeatedly. */
export function scheduleNinePmReminder(suffix: string, _level?: Level): void {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const at = new Date(now);
  at.setHours(21, 0, 0, 0);
  if (now >= at) at.setDate(at.getDate() + 1);
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      if (pendingBacklogCount(suffix) > 0) {
        new Notification('CA Study Tracker', {
          body: 'You have pending backlogs — don’t let yesterday stop today. Clear one now.',
          icon: '/icons/icon-192.png',
          tag: 'ca-backlog-reminder',
        });
      }
    } catch { /* notifications unavailable */ }
    scheduleNinePmReminder(suffix);
  }, at.getTime() - now.getTime());
}

export function reminderDismissed(suffix: string): boolean {
  return !!readJSON<unknown>(KEYS.notifDismissed(suffix), false);
}

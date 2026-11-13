import { useCallback, useEffect, useState } from 'react';
import { readJSON, writeJSON } from '../../lib/storage';

export interface AssistantPrefs {
  welcomed: boolean;
  tourDone: boolean;
  /** screens whose first-visit tip has been shown */
  tipsSeen: string[];
  side: 'left' | 'right';
  /** pixels above the resting spot */
  lift: number;
  /** Monday of the last week a recap was shown */
  recapWeek: string;
}

export const ASSISTANT_KEY = 'ca_assistant_v1';
const DEFAULTS: AssistantPrefs = { welcomed: false, tourDone: false, tipsSeen: [], side: 'right', lift: 0, recapWeek: '' };

function load(): AssistantPrefs {
  const raw = readJSON<Partial<AssistantPrefs> | null>(ASSISTANT_KEY, null);
  const p = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  p.tipsSeen = Array.isArray(p.tipsSeen) ? p.tipsSeen.filter((x) => typeof x === 'string') : [];
  p.side = p.side === 'left' ? 'left' : 'right';
  p.lift = Math.max(0, Math.min(2000, Number(p.lift) || 0));
  p.recapWeek = typeof p.recapWeek === 'string' ? p.recapWeek : '';
  return p;
}

export function useAssistantPrefs() {
  const [prefs, setPrefs] = useState<AssistantPrefs>(load);
  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === ASSISTANT_KEY) setPrefs(load()); };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);
  const update = useCallback((patch: Partial<AssistantPrefs>) => {
    setPrefs((p) => { const next = { ...p, ...patch }; writeJSON(ASSISTANT_KEY, next); return next; });
  }, []);
  return [prefs, update] as const;
}

/** Other parts of the app (Settings, the help button) ask the assistant to open through this event. */
export type AssistantRequest = { open: 'panel' | 'tour' | 'welcome' };
const EVENT = 'ca:assistant';
export const askAssistant = (r: AssistantRequest) => window.dispatchEvent(new CustomEvent<AssistantRequest>(EVENT, { detail: r }));
export const onAssistantRequest = (fn: (r: AssistantRequest) => void) => {
  const h = (e: Event) => fn((e as CustomEvent<AssistantRequest>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
};

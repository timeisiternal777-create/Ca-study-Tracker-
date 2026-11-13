import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { TabType } from '../types';

type Loader = () => Promise<{ default: ComponentType }>;

/** Each tab is its own chunk, loaded on first visit (and prefetched when the browser is idle). */
export const LOADERS: Record<TabType, Loader> = {
  DASHBOARD: () => import('./dashboard'),
  LOG: () => import('./log'),
  MOCK: () => import('./mock'),
  MOCK_DASHBOARD: () => import('./mock-analysis'),
  GAMIFICATION: () => import('./rewards'),
  WEEKLY: () => import('./heatmap'),
  CHARTS: () => import('./analytics'),
  SUBJECTS: () => import('./subjects'),
  TARGETS: () => import('./targets'),
  TARGET_ANALYSIS: () => import('./target-analysis'),
  MANIFESTATION: () => import('./manifest'),
  SETTINGS: () => import('./settings'),
  VOYAGE: () => import('../world/voyage/SeaChart'),
  GROUNDS: () => import('../world/academy/GroundsScreen'),
};

export const TABS = Object.fromEntries(
  (Object.keys(LOADERS) as TabType[]).map((k) => [k, lazy(LOADERS[k])]),
) as Record<TabType, LazyExoticComponent<ComponentType>>;

export function prefetchTabs(order: TabType[]) {
  const run = () => order.forEach((t, i) => window.setTimeout(() => void LOADERS[t](), i * 250));
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000});
  else window.setTimeout(run, 2000);
}

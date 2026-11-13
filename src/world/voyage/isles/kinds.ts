// Pure logic for the Ledger Seas islands: which island a paper gets, and where its lanterns stand. No drawing here, so the tests can import it.
const f1 = (n: number) => Math.round(n * 10) / 10;

export type IsleKind = 'counting' | 'statute' | 'orrery' | 'market' | 'tithe' | 'toll' | 'foundry' | 'watch' | 'vault' | 'chart';
export const ISLE_KINDS: IsleKind[] = ['counting', 'statute', 'orrery', 'market', 'tithe', 'toll', 'foundry', 'watch', 'vault', 'chart'];

/** The same subject always gets the same island, and the island is chosen for what the paper is about. */
const BY_SUBJECT: Record<string, IsleKind> = {
  'f-accounts': 'counting', 'inter-accounts': 'counting', 'fin-fr': 'counting',
  'f-laws': 'statute', 'inter-laws': 'statute',
  'f-qa': 'orrery', 'fin-sfm': 'orrery',
  'f-eco': 'market',
  'inter-idt': 'tithe', 'fin-idt': 'tithe',
  'inter-dt': 'toll', 'fin-dt': 'toll',
  'inter-costing': 'foundry',
  'inter-audit': 'watch', 'fin-audit': 'watch',
  'inter-fm': 'vault',
  'inter-sm': 'chart', 'fin-ibs': 'chart',
};
/** A paper outside the scheme (a custom subject) still gets an island, by its paper number. */
export function isleKindFor(subjectKey: string, paperNumber: number): IsleKind {
  return BY_SUBJECT[subjectKey] ?? ISLE_KINDS[(Math.max(1, Math.floor(paperNumber) || 1) - 1) % ISLE_KINDS.length];
}

/** Lantern positions along the front of the shore: an arc from the left tip to the right tip. */
export function lanternSpots(total: number): { x: number; y: number }[] {
  if (total <= 0) return [];
  return Array.from({ length: total }, (_, i) => {
    const a = (total === 1 ? 0.5 : i / (total - 1)) * Math.PI * 0.86 + Math.PI * 0.07;
    return { x: f1(Math.cos(a) * -84), y: f1(10 + Math.sin(a) * 31) };
  });
}

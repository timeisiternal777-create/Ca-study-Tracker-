export const QUOTES: { text: string; by: string }[] = [
  { text: 'The pen is mightier than the ledger — but only if you keep writing.', by: 'Study room wisdom' },
  { text: 'Discipline is choosing what you want most over what you want now.', by: 'Abraham Lincoln (attributed)' },
  { text: 'You don’t have to be great to start, but you have to start to be great.', by: 'Zig Ziglar' },
  { text: 'It always seems impossible until it is done.', by: 'Nelson Mandela' },
  { text: 'Small daily improvements are the key to staggering long-term results.', by: 'Robin Sharma' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', by: 'Robert Collier' },
  { text: 'Do what you can, with what you have, where you are.', by: 'Theodore Roosevelt' },
  { text: 'The future depends on what you do today.', by: 'Mahatma Gandhi' },
  { text: 'Focus on being productive instead of busy.', by: 'Tim Ferriss' },
  { text: 'Hard work beats talent when talent doesn’t work hard.', by: 'Tim Notke' },
  { text: 'A little progress each day adds up to big results.', by: 'Satya Nani' },
  { text: 'Every CA was once a student who refused to quit on a hard day.', by: 'Study room wisdom' },
];

/** Stable quote for a given date so it doesn't flicker on re-render. */
export function quoteFor(dateStr: string) {
  let h = 0;
  for (const ch of dateStr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return QUOTES[h % QUOTES.length];
}

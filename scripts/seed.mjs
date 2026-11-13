// Deterministic demo data for screenshots and tests. Mirrors the app's localStorage layout.
const INTER = [
  ['Advanced Accounting', ['Business Combinations', 'Consolidated FS', 'AS 15 Employee Benefits', 'Amalgamation', 'Ind AS 115']],
  ['Corporate & Other Laws', ['Companies Act – Incorporation', 'Share Capital', 'Directors & KMP', 'Meetings', 'FEMA basics']],
  ['Direct Tax (DT)', ['Salary income', 'House property', 'Capital gains', 'Clubbing', 'Deductions 80C–80U']],
  ['Indirect Tax (IDT)', ['GST – Supply', 'Place of supply', 'Input tax credit', 'Time of supply', 'Customs']],
  ['Cost & Management Accounting', ['Process costing', 'Marginal costing', 'Standard costing', 'Budgetary control', 'Joint products']],
  ['Auditing & Ethics', ['SA 200–299', 'Audit evidence', 'Company audit', 'Ethics & Code', 'Sampling']],
  ['Financial Management (FM)', ['Leverage', 'Capital budgeting', 'Working capital', 'Ratio analysis']],
  ['Strategic Management (SM)', ['Strategic analysis', 'Business policy', 'Strategy implementation']],
];

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function buildSeed({ today = new Date(), days = 84, seed = 11, level = 'inter', examInDays = 112, name = 'Priyesh', goal = 8, withLogs = true, todayLog = true } = {}) {
  const rand = rng(seed);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const store = {};
  const exam = new Date(today); exam.setDate(exam.getDate() + examInDays);
  store.ca_level_selected = level;
  store[`ca_group_selected_${level}`] = 'both';
  store[`ca_active_subjects_${level}`] = JSON.stringify(INTER.map((s) => s[0]));
  store.ca_schema_version_v5 = '5';
  store.hasSeenGuide = 'true';
  store.ca_settings_v3 = JSON.stringify({
    onboardingCompleted: true, dailyGoalHours: goal, targetExamDate: ymd(exam), displayName: name,
    pastHours: { 'Advanced Accounting': 38, 'Corporate & Other Laws': 22, 'Direct Tax (DT)': 15 },
    hudChimes: false, beastNotifs: true,
  });
  if (!withLogs) return store;

  const logs = [];
  for (let i = days; i >= (todayLog ? 0 : 1); i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dow = d.getDay();
    // Realistic rhythm: strong weekdays, a few skipped days, ramping up over time.
    const ramp = 0.55 + 0.45 * ((days - i) / days);
    let total = i === 0 ? 4.5 : (dow === 0 ? 5 : 8.2) * ramp + (rand() - 0.5) * 3.2;
    if (i > 0 && rand() < 0.07) continue; // skipped day
    if (i > 0 && rand() < 0.08) total = 10.5 + rand() * 2; // beast day
    total = Math.max(1.5, Math.round(total * 2) / 2);
    const n = i === 0 ? 2 : total > 7 ? 3 : total > 3.5 ? 2 : 1;
    const subs = []; while (subs.length < n) { const s = pick(INTER); if (!subs.includes(s)) subs.push(s); }
    const parts = subs.map((_, k) => (k < n - 1 ? Math.round((total / n) * 2) / 2 : 0));
    parts[n - 1] = Math.max(0.5, total - parts.reduce((a, b) => a + b, 0));
    const log = { id: ymd(d), date: ymd(d), createdAt: d.getTime() };
    for (let k = 0; k < 3; k++) {
      const s = subs[k];
      log[`subject${k + 1}`] = s ? s[0] : '';
      log[`topic${k + 1}`] = s ? pick(s[1]) : '';
      log[`hours${k + 1}`] = s ? parts[k] : 0;
      log[`targetHours${k + 1}`] = s ? Math.max(1, Math.round(parts[k])) : 0;
    }
    logs.push(log);
  }
  store[`ca_study_logs_v4_${level}`] = JSON.stringify(logs);

  const mocks = [];
  const maxOf = { 'Direct Tax (DT)': 50, 'Indirect Tax (IDT)': 50, 'Financial Management (FM)': 50, 'Strategic Management (SM)': 50 };
  for (let k = 0; k < 16; k++) {
    const d = new Date(today); d.setDate(d.getDate() - (days - 6 - k * 5));
    const s = INTER[k % INTER.length][0];
    const max = maxOf[s] || 100;
    const base = 0.38 + 0.3 * (k / 16) + (rand() - 0.5) * 0.18;
    mocks.push({ id: `m${k}`, date: ymd(d), subject: s, marks: Math.max(0, Math.min(max, Math.round(base * max))), notes: pick(['Silly mistakes in consolidation', 'Speed was fine', 'Missed two theory questions', 'Practised ICAI mock paper', 'Good attempt, weak on case studies', 'Revision test']) });
  }
  store[`ca_mock_scores_v4_${level}`] = JSON.stringify(mocks);
  return store;
}

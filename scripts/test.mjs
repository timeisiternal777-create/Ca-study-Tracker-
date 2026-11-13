// Logic tests for the rewards engine. Run: node scripts/test.mjs
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { root } from './lib.mjs';

const dir = await mkdtemp(path.join(tmpdir(), 'ca-test-'));
const entry = path.join(dir, 'entry.ts');
await (await import('node:fs/promises')).writeFile(entry, `
export * from ${JSON.stringify(path.join(root, 'src/lib/stats.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/quests.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/phases.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/readiness.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/date.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/schedule.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/assistant.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/milestones.ts'))};
export { installPdfFonts, normalize, measure, fit, wrap } from ${JSON.stringify(path.join(root, 'src/lib/pdf.ts'))};
export { buildReportPdf } from ${JSON.stringify(path.join(root, 'src/lib/reportPdf.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/log.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/timer.ts'))};
export { summarise, verdictOf, newGov, judge } from ${JSON.stringify(path.join(root, 'src/lib/motion.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/world/voyage/progress.ts'))};
export { normaliseVoyage, DEFAULT_CAPTAIN, DEFAULT_SHIP } from ${JSON.stringify(path.join(root, 'src/world/voyage/voyageState.ts'))};
export { crewLines, daySeed } from ${JSON.stringify(path.join(root, 'src/world/crew/lines.ts'))};
export { wordsFor, VOYAGE_RANKS, ACADEMY_RANKS, normaliseWorld } from ${JSON.stringify(path.join(root, 'src/world/words.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/world/academy/choosing.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/world/academy/houses.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/world/academy/grounds.ts'))};
export { normaliseAcademy, EMPTY_ACADEMY } from ${JSON.stringify(path.join(root, 'src/world/academy/academyState.ts'))};
export { isleKindFor, lanternSpots, ISLE_KINDS } from ${JSON.stringify(path.join(root, 'src/world/voyage/isles/kinds.ts'))};
export { CURRICULUM } from ${JSON.stringify(path.join(root, 'src/config/curriculum.ts'))};
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: path.join(dir, 'out.mjs'), logLevel: 'error' });
const L = await import(pathToFileURL(path.join(dir, 'out.mjs')).href);
await rm(dir, { recursive: true, force: true });

let n = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok  ' + name); } catch (e) { console.error('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };

const TODAY = '2026-10-29'; // a Thursday
const log = (date, h, s = 'Accounting', s2 = '', h2 = 0) => ({ id: date, date, subject1: s, topic1: '', hours1: h, subject2: s2, topic2: '', hours2: h2, subject3: '', topic3: '', hours3: 0, createdAt: 0 });
const days = (from, n, h) => Array.from({ length: n }, (_, i) => log(L.addDays(from, i), h));
const stats = (logs, extra = {}) => L.computeStats({ logs, mocks: extra.mocks || [], settings: { pastHours: {}, dailyGoalHours: extra.goal ?? 8, targetExamDate: extra.exam ?? '2027-02-27', restDays: extra.rest ?? [] }, mockMax: () => 100, subjects: extra.subjects ?? ['Accounting', 'Law'], game: extra.game, today: extra.today ?? TODAY });

console.log('Streaks');
t('streak threshold follows the goal', () => { assert.equal(L.streakMinFor(8), 6); assert.equal(L.streakMinFor(4), 3); assert.equal(L.streakMinFor(2), 2); assert.equal(L.streakMinFor(12), 6); });
t('plain streak counts consecutive days, today pending', () => {
  const s = stats(days('2026-10-24', 5, 7)); // 24..28
  assert.equal(s.currentFireStreak, 5); assert.equal(s.fireToday, false);
});
t('today joins the streak once it reaches the threshold', () => {
  const s = stats([...days('2026-10-24', 5, 7), log(TODAY, 6)]);
  assert.equal(s.currentFireStreak, 6); assert.equal(s.fireToday, true);
});
t('7 days in a row banks a freeze, a missed day spends it', () => {
  const s = stats([...days('2026-10-18', 7, 7), ...days('2026-10-26', 3, 7)]); // 18..24, miss 25, 26..28
  assert.equal(s.currentFireStreak, 10); assert.equal(s.freezes, 0); assert.deepEqual(s.frozenDays, ['2026-10-25']);
});
t('without a freeze a miss resets the streak', () => {
  const s = stats([...days('2026-10-20', 4, 7), ...days('2026-10-26', 3, 7)]); // miss 24, 25
  assert.equal(s.currentFireStreak, 3); assert.equal(s.maxStreak, 4);
});
t('freezes cap at two', () => {
  const s = stats(days('2026-10-01', 28, 7));
  assert.equal(s.currentFireStreak, 28); assert.equal(s.freezes, 2);
});
t('planned rest days hold the streak', () => {
  // 2026-10-25 is a Sunday (0)
  const s = stats([...days('2026-10-19', 6, 7), ...days('2026-10-26', 3, 7)], { rest: [0] });
  assert.equal(s.currentFireStreak, 9);
});
t('a missed non-rest day still breaks it', () => {
  const s = stats([...days('2026-10-19', 5, 7), ...days('2026-10-26', 3, 7)], { rest: [0] }); // misses Sat 24
  assert.equal(s.currentFireStreak, 3);
});

console.log('Goal weeks');
t('a Mon–Sun week at goal×5 counts', () => {
  const s = stats(days('2026-10-19', 5, 8)); // Mon 19..Fri 23 = 40h; the week of the 26th is still open
  assert.equal(s.goalWeekStreak, 1);
});
t('consecutive goal weeks build a streak, open week never breaks it', () => {
  const s = stats([...days('2026-10-12', 5, 8), ...days('2026-10-19', 5, 8)]); // weeks of 12th and 19th done, week of 26th open
  assert.equal(s.goalWeekStreak, 2); assert.equal(s.goalWeek.done, false);
});
t('a missed finished week resets it', () => {
  const s = stats([...days('2026-10-12', 5, 8), ...days('2026-10-26', 3, 8)]); // week of 19th empty
  assert.equal(s.goalWeekStreak, 0);
});
t('rest days lower the weekly target', () => { const s = stats([], { rest: [0, 6, 5] }); assert.equal(s.goalWeek.target, 32); });

console.log('XP');
t('hours are capped at 12 a day', () => {
  const a = stats([log(TODAY, 24)]).xpBreakdown.hours; const b = stats([log(TODAY, 12)]).xpBreakdown.hours;
  assert.equal(a, b); assert.equal(a, 120);
});
t('mock XP scales with the score', () => { assert.equal(L.mockXP(50), 50); assert.equal(L.mockXP(100), 80); assert.equal(L.mockXP(0), 20); });
t('claimed quests add XP', () => {
  const s = stats([], { game: { rankFloor: 0, claims: { 'd:x:goal': 30, 'w:y:mock': 80 } } });
  assert.equal(s.xpBreakdown.quests, 110); assert.equal(s.totalXP, 110);
});
t('head-start hours earn half rate', () => {
  const s = L.computeStats({ logs: [], mocks: [], settings: { pastHours: { Accounting: 100 }, dailyGoalHours: 8, targetExamDate: '2027-02-27' }, mockMax: () => 100, today: TODAY });
  assert.equal(s.xpBreakdown.hours, 500);
});

console.log('Ranks');
t('ladder is strictly increasing and starts at 0', () => {
  for (const sc of [0.35, 0.5, 1, 1.6, 2.5]) { const l = L.ladderFor(sc); assert.equal(l[0].minXP, 0); for (let i = 1; i < l.length; i++) assert.ok(l[i].minXP > l[i - 1].minXP, `scale ${sc} step ${i}`); }
});
t('a shorter prep scales the ladder down', () => { assert.ok(L.rankScale(8, TODAY, '2026-12-29') < L.rankScale(8, TODAY, '2027-04-29')); });
t('the rank never drops below the floor', () => {
  const l = L.ladderFor(1); const r = L.rankFor(0, l, 3);
  assert.equal(r.level, 4); assert.equal(r.held, true); assert.equal(r.progress, 0);
});
t('rank progress is between 0 and 100', () => { const r = L.rankFor(500, L.ladderFor(1)); assert.ok(r.progress > 0 && r.progress < 100); assert.equal(r.title, 'Ledger Keeper'); });
t('top rank is capped', () => { const r = L.rankFor(10 ** 6, L.ladderFor(1)); assert.equal(r.isMax, true); assert.equal(r.progress, 100); });

console.log('Readiness');
t('nothing logged scores 0', () => { const r = stats([]).readiness; assert.equal(r.score, 0); assert.equal(r.started, false); });
t('a steady fortnight scores well but is capped without mocks', () => {
  const r = stats(days('2026-10-15', 14, 8), { subjects: ['Accounting'] }).readiness; // up to 28th
  assert.ok(r.score > 40 && r.score <= 80, 'score ' + r.score); assert.equal(r.capped, true);
});
t('good mocks lift the score', () => {
  const base = stats(days('2026-10-15', 14, 8), { subjects: ['Accounting'] }).readiness.score;
  const mocks = [{ id: 'm1', date: '2026-10-27', subject: 'Accounting', marks: 75, notes: '' }];
  const withMock = stats(days('2026-10-15', 14, 8), { subjects: ['Accounting'], mocks }).readiness;
  assert.equal(withMock.capped, false); assert.ok(withMock.score >= base - 1);
});
t('score stays inside 0–100', () => { const r = stats(days('2026-06-01', 150, 12), { subjects: ['Accounting'], mocks: [{ id: 'm', date: TODAY, subject: 'Accounting', marks: 100, notes: '' }] }).readiness; assert.ok(r.score <= 100 && r.score >= 0); });

console.log('Quests');
t('daily and weekly quests are built with period keys', () => {
  const qs = L.buildQuests({ today: TODAY, logs: [log(TODAY, 8)], mocks: [], goal: 8, subjects: ['Accounting', 'Law'], subjectHours: { Accounting: 10, Law: 2 }, dailyTotals: { [TODAY]: 8 }, claims: {} });
  const goal = qs.find((q) => q.id === 'goal'); assert.ok(goal.done); assert.equal(goal.key, `d:${TODAY}:goal`);
  assert.equal(qs.find((q) => q.id === 'weak').title, 'Give Law an hour');
  assert.equal(qs.filter((q) => q.kind === 'weekly').length, 3);
});
t('claims mark quests as claimed', () => {
  const qs = L.buildQuests({ today: TODAY, logs: [], mocks: [], goal: 8, subjects: ['A', 'B'], subjectHours: {}, dailyTotals: {}, claims: { [`d:${TODAY}:goal`]: 30 } });
  assert.equal(qs.find((q) => q.id === 'goal').claimed, true); assert.equal(qs.find((q) => q.id === 'variety').claimed, false);
});
t('a single paper skips the paper-based quests', () => {
  const qs = L.buildQuests({ today: TODAY, logs: [], mocks: [], goal: 6, subjects: ['A'], subjectHours: {}, dailyTotals: {}, claims: {} });
  assert.deepEqual(qs.map((q) => q.id), ['goal', 'days', 'mock']);
});

console.log('Phases');
t('phases follow the days left', () => {
  const ids = [200, 121, 120, 61, 60, 22, 21, 8, 7, 0, -1].map((d) => L.phaseFor(d).id);
  assert.deepEqual(ids, ['learn', 'learn', 'practice', 'practice', 'revise', 'revise', 'sprint', 'sprint', 'final', 'final', 'done']);
});

console.log('Scheduler');
const item = (id, subject, topic, hours, completed = false) => ({ id, subject, topic, hours, targetHours: hours, completed });
const PLAN = { excludeSundays: true, sundayHours: 4, restDays: [] };
const topics = [item('a1', 'A', 'A one', 6), item('a2', 'A', 'A two', 3), item('b1', 'B', 'B one', 5), item('b2', 'B', 'B two', 2.5), item('c1', 'C', 'C one', 4), item('d1', 'A', 'Done already', 9, true)];
const total = 6 + 3 + 5 + 2.5 + 4;
t('every unfinished hour is placed when there is room', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-13', perDay: 2, hoursPerDay: 6, plan: PLAN });
  assert.equal(r.leftover, 0); assert.ok(Math.abs(r.hours - total) < 0.01, 'placed ' + r.hours);
  assert.equal(r.topics, 5);
});
t('hours per topic add up and every row is linked to its topic', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-13', perDay: 2, hoursPerDay: 6, plan: PLAN });
  const by = {}; for (const row of r.rows) { assert.ok(row.topicId); by[row.topicId] = (by[row.topicId] || 0) + row.targetHours; }
  assert.deepEqual(Object.keys(by).sort(), ['a1', 'a2', 'b1', 'b2', 'c1']);
  assert.ok(Math.abs(by.a1 - 6) < 0.01 && Math.abs(by.b2 - 2.5) < 0.01);
});
t('no day holds more than its capacity', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-13', perDay: 2, hoursPerDay: 6, plan: PLAN });
  const day = {}; for (const row of r.rows) day[row.date] = (day[row.date] || 0) + row.targetHours;
  for (const [d, h] of Object.entries(day)) assert.ok(h <= 6.01, d + ' ' + h);
});
t('papers take turns: days hold the papers asked for, and only the last days (when papers run out) hold more', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-13', perDay: 2, hoursPerDay: 6, plan: PLAN });
  const subj = {}; for (const row of r.rows) (subj[row.date] ||= new Set()).add(row.subject);
  const dates = Object.keys(subj).sort();
  const over = dates.filter((d) => subj[d].size > 2);
  assert.ok(over.length <= 1, 'days over: ' + over.join());
  for (const d of over) assert.ok(dates.indexOf(d) >= dates.length - 2, 'only near the end');
  assert.ok(dates.slice(0, 2).every((d) => subj[d].size === 2));
});
t('Sundays are skipped unless you study them', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-15', perDay: 2, hoursPerDay: 6, plan: PLAN });
  assert.ok(!r.rows.some((row) => row.date === '2026-11-08' || row.date === '2026-11-15'));
  const r2 = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-15', perDay: 2, hoursPerDay: 2, plan: { ...PLAN, excludeSundays: false } });
  assert.ok(r2.rows.some((row) => row.date === '2026-11-08' && row.isSunday));
});
t('rest days are skipped', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-13', perDay: 2, hoursPerDay: 6, plan: { ...PLAN, restDays: [{ key: 'k', label: 'Diwali', date: '2026-11-03', off: true }] } });
  assert.ok(!r.rows.some((row) => row.date === '2026-11-03'));
});
t('hours that do not fit are reported, with the hours a day that would fit', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-04', perDay: 2, hoursPerDay: 4, plan: PLAN });
  assert.ok(r.leftover > 0); assert.ok(r.neededPerDay > 4);
  const fit = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-04', perDay: 2, hoursPerDay: r.neededPerDay + 0.5, plan: PLAN });
  assert.ok(fit.leftover < 0.6, 'leftover ' + fit.leftover);
});
t('row ids are unique and rows are in date order', () => {
  const r = L.scheduleSyllabus(topics, { from: '2026-11-02', to: '2026-11-13', perDay: 3, hoursPerDay: 6, plan: PLAN });
  assert.equal(new Set(r.rows.map((x) => x.id)).size, r.rows.length);
  for (let i = 1; i < r.rows.length; i++) assert.ok(r.rows[i].date >= r.rows[i - 1].date);
});
t('nothing to schedule gives an empty result', () => { const r = L.scheduleSyllabus([item('x', 'A', 'x', 3, true)], { from: '2026-11-02', to: '2026-11-13', perDay: 2, hoursPerDay: 6, plan: PLAN }); assert.equal(r.rows.length, 0); assert.equal(r.leftover, 0); });

console.log('Blip');
const F = { hour: 10, goal: 8, todayHours: 0, streak: 0, streakMin: 6, freezes: 0, fireToday: false, daysLogged: 20, daysSinceLog: 0, readyQuests: 0, backlog: 0, weakest: null, weakestDaysSince: null, daysSinceMock: 2, mocksPerWeek: 1, hasPlan: true, daysLeft: 90, phaseTitle: 'Practise', readinessCapped: false };
t('a brand-new student is told to log first', () => { const s = L.suggestions({ ...F, daysLogged: 0, daysSinceLog: null, hasPlan: false }); assert.equal(s[0].id, 'first-log'); });
t('an evening with a streak at risk comes first and says how many hours', () => {
  const s = L.suggestions({ ...F, hour: 20, streak: 9, todayHours: 2, readyQuests: 1 });
  assert.equal(s[0].id, 'streak-risk'); assert.match(s[0].title, /9-day streak needs 4h/); assert.equal(s[0].mood, 'worry');
});
t('the same streak in the morning is a gentle nudge', () => { const s = L.suggestions({ ...F, hour: 9, streak: 9 }); assert.equal(s[0].id, 'streak-today'); });
t('quests ready to collect are surfaced', () => { const s = L.suggestions({ ...F, readyQuests: 2 }); assert.equal(s[0].id, 'collect'); assert.match(s[0].title, /2 quests/); });
t('goal met gets praise', () => { const s = L.suggestions({ ...F, todayHours: 8.5, fireToday: true, streak: 4 }); assert.ok(s.some((x) => x.id === 'goal-met' && x.mood === 'proud')); });
t('after the exam only one message is shown', () => { const s = L.suggestions({ ...F, daysLeft: -3 }); assert.equal(s.length, 1); assert.equal(s[0].id, 'exam-over'); });
t('a neglected paper and a missing mock are flagged', () => {
  const s = L.suggestions({ ...F, weakest: 'Direct Tax', weakestDaysSince: 9, daysSinceMock: 20 });
  assert.ok(s.some((x) => x.id === 'weakest')); assert.ok(s.some((x) => x.id === 'mock'));
});
t('no mock nudge in the learn phase', () => { const s = L.suggestions({ ...F, phaseTitle: 'Learn', daysSinceMock: null }); assert.ok(!s.some((x) => x.id === 'mock')); });
t('a quiet late night suggests sleep', () => { const s = L.suggestions({ ...F, hour: 23, todayHours: 9, fireToday: true }); assert.ok(s.length >= 1); assert.equal(L.restingMood({ ...F, hour: 23 }, s[0]), 'sleepy'); });
t('suggestions are sorted by weight', () => { const s = L.suggestions({ ...F, hour: 20, streak: 3, readyQuests: 1, backlog: 4, weakest: 'FM', weakestDaysSince: 6 }); for (let i = 1; i < s.length; i++) assert.ok(s[i - 1].weight >= s[i].weight); });
const ask = (q) => L.searchHelp(q).map((h) => h.id);
t('help finds backups', () => assert.equal(ask('how do I back up my data')[0], 'backup'));
t('help finds freezes', () => assert.equal(ask('what is a streak freeze')[0], 'freeze'));
t('help finds XP', () => assert.equal(ask('how to get xp')[0], 'xp'));
t('help finds readiness', () => assert.equal(ask('what does readiness mean')[0], 'readiness'));
t('help finds planning', () => assert.equal(ask('schedule my syllabus')[0], 'plan'));
t('help finds Excel import', () => assert.equal(ask('import excel')[0], 'excel'));
t('help finds sound settings', () => assert.equal(ask('turn off sounds')[0], 'sound'));
t('help finds themes', () => assert.equal(ask('change the colour')[0], 'theme'));
t('help finds Blip', () => assert.equal(ask('are you an ai')[0], 'blip'));
t('help finds the tour', () => assert.equal(ask('show me the tutorial')[0], 'tour'));
t('help finds rest days', () => assert.ok(ask('i want to take sunday off').slice(0, 2).includes('rest')));
t('nonsense and blanks find nothing', () => { assert.deepEqual(ask('zzqx'), []); assert.deepEqual(ask('   '), []); assert.deepEqual(ask('the and for'), []); });

// ── milestones and the weekly recap ──
const MI = (o = {}) => ({ today: '2026-10-29', weekStart: '2026-10-26', rank: { level: 3, title: 'Mid' }, badges: [{ id: 'a', title: 'A', description: 'da', unlocked: true }, { id: 'b', title: 'B', description: 'db', unlocked: false }], freezes: 1, todayHours: 2, goalHours: 8, goalWeekDone: false, ...o });
t('first run only records where you are, no popups', () => { const r = L.detectMilestones(null, MI()); assert.equal(r.events.length, 0); assert.equal(r.next.rank, 3); assert.deepEqual(r.next.badges, ['a']); });
t('nothing changed means nothing fires', () => { const a = L.detectMilestones(null, MI()).next; assert.equal(L.detectMilestones(a, MI()).events.length, 0); });
t('a rank-up fires once', () => { const a = L.detectMilestones(null, MI()).next; const r = L.detectMilestones(a, MI({ rank: { level: 4, title: 'Higher' } })); assert.equal(r.events.length, 1); assert.equal(r.events[0].kind, 'rank'); assert.equal(r.events[0].title, 'Higher'); assert.equal(L.detectMilestones(r.next, MI({ rank: { level: 4, title: 'Higher' } })).events.length, 0); });
t('a rank that drops and returns does not fire again', () => { const a = L.detectMilestones(null, MI({ rank: { level: 5, title: 'X' } })).next; const down = L.detectMilestones(a, MI({ rank: { level: 4, title: 'Y' } })); assert.equal(down.next.rank, 5); assert.equal(L.detectMilestones(down.next, MI({ rank: { level: 5, title: 'X' } })).events.length, 0); });
t('a new badge fires with its description', () => { const a = L.detectMilestones(null, MI()).next; const r = L.detectMilestones(a, MI({ badges: [{ id: 'a', title: 'A', description: 'da', unlocked: true }, { id: 'b', title: 'B', description: 'db', unlocked: true }] })); assert.equal(r.events.length, 1); assert.equal(r.events[0].title, 'B'); assert.equal(r.events[0].sub, 'db'); });
t('the daily-goal card shows once a day, even if you edit the log', () => {
  const a = L.detectMilestones(null, MI()).next;
  const hit = L.detectMilestones(a, MI({ todayHours: 8 })); assert.equal(hit.events.length, 1); assert.equal(hit.events[0].kind, 'goal');
  const dip = L.detectMilestones(hit.next, MI({ todayHours: 7 })); assert.equal(dip.events.length, 0);
  assert.equal(L.detectMilestones(dip.next, MI({ todayHours: 9 })).events.length, 0);
  assert.equal(L.detectMilestones(dip.next, MI({ today: '2026-10-30', todayHours: 9 })).events.length, 1);
});
t('earning a streak freeze and finishing a goal week both fire', () => { const a = L.detectMilestones(null, MI()).next; const r = L.detectMilestones(a, MI({ freezes: 2, goalWeekDone: true })); assert.deepEqual(r.events.map((e) => e.kind).sort(), ['freeze', 'week']); });
t('spending a freeze is not a celebration', () => { const a = L.detectMilestones(null, MI({ freezes: 2 })).next; assert.equal(L.detectMilestones(a, MI({ freezes: 1 })).events.length, 0); });
t('a burst of milestones becomes one card', () => { const ev = Array.from({ length: 5 }, (_, i) => ({ kind: 'badge', title: 'B' + i })); const sq = L.squash(ev); assert.equal(sq.length, 1); assert.match(sq[0].title, /5 new milestones/); assert.equal(L.squash(ev.slice(0, 3)).length, 3); });
t('damaged saved records are ignored, not trusted', () => { assert.equal(L.normalizeSeen(null), null); assert.equal(L.normalizeSeen('x'), null); assert.equal(L.normalizeSeen({ rank: 'a' }), null); const ok = L.normalizeSeen({ rank: 4.7, badges: ['a', 3, null], freezes: -2 }); assert.equal(ok.rank, 4); assert.deepEqual(ok.badges, ['a']); assert.equal(ok.freezes, 0); });
const dt = {}; for (let i = 0; i < 5; i++) dt[L.addDays('2026-10-19', i)] = 6;   // Mon 19 to Fri 23 Oct: 30h on 5 days
t('the recap appears on Monday and Tuesday only', () => { assert.ok(L.weeklyRecap(dt, '2026-10-26', 40, 1)); assert.ok(L.weeklyRecap(dt, '2026-10-27', 40, 2)); assert.equal(L.weeklyRecap(dt, '2026-10-29', 40, 4), null); assert.equal(L.weeklyRecap(dt, '2026-10-25', 40, 0), null); });
t('the recap reports last week and compares it with the target', () => { const lo = L.weeklyRecap(dt, '2026-10-26', 40, 1); assert.match(lo.text, /30h over 5 days/); assert.equal(lo.mood, 'happy'); const hi = L.weeklyRecap(dt, '2026-10-26', 25, 1); assert.equal(hi.mood, 'proud'); assert.equal(hi.week, '2026-10-26'); });
t('a week with no study gets no recap', () => assert.equal(L.weeklyRecap({}, '2026-10-26', 40, 1), null));
t('one day reads as "1 day"', () => { const r = L.weeklyRecap({ '2026-10-20': 3 }, '2026-10-26', 40, 1); assert.match(r.text, /3h over 1 day\./); });

console.log('PDF reports');
const ta = async (name, fn) => { try { await fn(); n++; console.log('  ok  ' + name); } catch (e) { console.error('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };
{
  const { readFile } = await import('node:fs/promises');
  const rd = async (f) => new Uint8Array(await readFile(path.join(root, 'public/fonts', f)));
  L.installPdfFonts(await rd('comic-relief-400.ttf'), await rd('comic-relief-700.ttf'));
}
t('text is measured with the real font: wide letters are wider, size scales it', () => {
  assert.ok(L.measure('WWWW', 10) > L.measure('iiii', 10) * 1.5);
  assert.ok(Math.abs(L.measure('Study', 20) - 2 * L.measure('Study', 10)) < 1e-6);
  assert.equal(L.measure('', 10), 0);
  assert.ok(L.measure('Study', 10, 'bold') > L.measure('Study', 10));
});
t('wrapping never overflows and never loses a word', () => {
  const txt = 'Companies Act incorporation of a private company and the memorandum of association';
  const lines = L.wrap(txt, 120, 9);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(L.measure(l, 9) <= 120 + 1e-6, l);
  assert.equal(lines.join(' '), txt);
});
t('one very long word is broken instead of overflowing', () => { const lines = L.wrap('Supercalifragilisticexpialidocious', 60, 10); assert.ok(lines.length > 1); for (const l of lines) assert.ok(L.measure(l, 10) <= 60 + 1e-6); });
t('long text is shortened with an ellipsis that fits', () => { const f = L.fit('Cost and Management Accounting practice questions', 90, 9); assert.ok(f.endsWith('…')); assert.ok(L.measure(f, 9) <= 90 + 1e-6); assert.equal(L.fit('Short', 90, 9), 'Short'); });
t('emoji and invisible characters vanish, while rupee and arrows stay', () => {
  assert.equal(L.normalize('Study \u{1F4DA} ok​ now'), 'Study  ok now');
  assert.equal(L.normalize('₹5 → 6'), '₹5 → 6');
  assert.equal(L.normalize('a\nb\tc'), 'a b c');
});
const SUBJ = [{ id: 'a', name: 'Accounting', abbrev: 'AC', paperNumber: 1, group: 'group1', marks: 100, accent: 'cyan' }, { id: 'l', name: 'Law', abbrev: 'LAW', paperNumber: 2, group: 'group1', marks: 100, accent: 'violet' }];
const reportInput = (extra = {}) => ({ title: 'Study report', displayName: 'Test', level: 'inter', groupLabel: 'Group 1', rangeLabel: 'Last 7 days', examDate: '2027-02-21', stats: stats(days('2026-10-24', 5, 7)), logs: days('2026-10-24', 5, 7), mocks: [], subjects: SUBJ, dailyGoalHours: 8, rangeStart: '2026-10-24', rangeEnd: '2026-10-30', ...extra });
const latin = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('latin1');
await ta('a report is a valid PDF with the font embedded and a correct cross-reference table', async () => {
  const s = await latin(await L.buildReportPdf(reportInput()));
  assert.ok(s.startsWith('%PDF-1.4')); assert.ok(s.trimEnd().endsWith('%%EOF'));
  assert.match(s, /\/Type \/Catalog/); assert.match(s, /\/FontFile2 \d+ 0 R/); assert.match(s, /\/Subtype \/CIDFontType2/); assert.match(s, /\/ToUnicode \d+ 0 R/);
  const xr = s.lastIndexOf('startxref'); const off = Number(s.slice(xr + 10).split('\n')[0]);
  assert.ok(s.slice(off).startsWith('xref'));
  const first = s.slice(off).split('\n')[3]; assert.ok(s.slice(Number(first.slice(0, 10))).startsWith('1 0 obj'));
});
await ta('tablet reports are 16:10 landscape and A4 reports are portrait', async () => {
  assert.match(await latin(await L.buildReportPdf(reportInput({ page: 'tablet' }))), /\/MediaBox \[0 0 842 526\]/);
  assert.match(await latin(await L.buildReportPdf(reportInput({ page: 'a4' }))), /\/MediaBox \[0 0 595\.28 841\.89\]/);
});
await ta('every look builds, including an empty report and awkward text', async () => {
  for (const theme of ['night', 'sky', 'paper']) for (const page of ['tablet', 'a4']) assert.ok((await L.buildReportPdf(reportInput({ theme, page }))).size > 20000, theme + ' ' + page);
  assert.ok((await L.buildReportPdf(reportInput({ logs: [], rangeStart: '2026-10-30', rangeEnd: '2026-10-30' }))).size > 20000);
  const weird = days('2026-10-24', 3, 7).map((l) => ({ ...l, topic1: '\u{1F4DA} ' + 'Very long topic name '.repeat(30) + '\n₹ → ✓ ★', subject1: 'Unknown paper \u{1F642}' }));
  assert.ok((await L.buildReportPdf(reportInput({ logs: weird }))).size > 20000);
});
await ta('a long range makes more pages, not a broken file', async () => {
  const many = days('2026-06-01', 150, 6);
  const s = await latin(await L.buildReportPdf(reportInput({ logs: many, rangeStart: '2026-06-01', rangeEnd: '2026-10-28', stats: stats(many) })));
  const pages = (s.match(/\/Type \/Page /g) || []).length;
  assert.ok(pages >= 8, 'pages ' + pages);
});

// ───────────────────────── Log slots and the study timer ─────────────────────────
console.log('Log slots');
process.env.TZ = 'Asia/Kolkata';
const at = (d, h, m = 0, s = 0) => new Date(2026, 9, d, h, m, s).getTime();
const day = (d) => `2026-10-${String(d).padStart(2, '0')}`;
const min = 60000;
const T0 = at(28, 9);
const fresh = (d = day(28)) => L.emptyLog(d);
const sl = (l, i) => L.getSlot(l, i);

t('six slots exist and the helpers agree', () => {
  assert.equal(L.MAX_SLOTS, 6); assert.deepEqual([...L.SLOTS], [1, 2, 3, 4, 5, 6]);
  const l = ['A', 'B', 'C', 'D', 'E', 'F'].reduce((x, s, i) => L.withSlot(x, i + 1, { subject: s, hours: i + 1 }), fresh());
  assert.equal(L.logHours(l), 21); assert.equal(L.firstFreeSlot(l), 0); assert.equal(L.filledSlots(l).length, 6);
  assert.deepEqual(L.subjectHoursOf(l).map((x) => x[0]), ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(L.firstFreeSlot(fresh()), 1); assert.equal(L.firstFreeSlot(undefined), 1);
});
t('a subject is found whatever its case or spacing, and an empty name matches nothing', () => {
  const l = L.withSlot(L.withSlot(fresh(), 1, { subject: 'Law', hours: 1 }), 2, { subject: 'Cost and Management', hours: 1 });
  assert.equal(L.slotOfSubject(l, ' law '), 1); assert.equal(L.slotOfSubject(l, 'COST AND MANAGEMENT'), 2);
  assert.equal(L.slotOfSubject(l, 'Tax'), 0); assert.equal(L.slotOfSubject(l, ''), 0); assert.equal(L.slotOfSubject(undefined, 'Law'), 0);
  assert.equal(L.sameSubject('Law', ' law'), true); assert.equal(L.sameSubject('', ''), false);
});
t('saved logs keep slots 4 to 6 only when used, and clean up bad numbers', () => {
  const plain = L.normaliseLog({ date: day(28), subject1: 'Law', hours1: 2 });
  assert.equal('subject4' in plain, false); assert.equal(plain.hours1, 2);
  const six = L.normaliseLog({ date: day(28), subject4: 'Audit', hours4: 1.5, subject6: 'Tax', hours6: 99, targetHours5: 3, hours2: -4, hours3: 'x' });
  assert.equal(six.subject4, 'Audit'); assert.equal(six.hours4, 1.5); assert.equal(six.hours6, 24); assert.equal(six.targetHours5, 3);
  assert.equal(six.hours2, 0); assert.equal(six.hours3, 0); assert.equal('subject5' in six, false);
});
t('stats count every slot of a day', () => {
  const l = { ...fresh(), subject1: 'Accounting', hours1: 2, subject4: 'Law', hours4: 1.5, subject6: 'Audit', hours6: 0.5 };
  const s = stats([l], { subjects: ['Accounting', 'Law', 'Audit'] });
  assert.equal(s.dailyTotals[day(28)], 4); assert.equal(s.subjectHours.Law, 1.5); assert.equal(s.subjectHours.Audit, 0.5); assert.equal(s.loggedHours, 4);
});

console.log('Study timer: the clock');
t('the clock counts running time only', () => {
  let s = L.startTimer('inter', 'Law', '', T0, 'a');
  assert.equal(L.elapsedMs(s, T0 + 10 * min), 10 * min);
  s = L.pauseTimer(s, T0 + 10 * min);
  assert.equal(L.elapsedMs(s, T0 + 50 * min), 10 * min); // paused time never counts
  s = L.resumeTimer(s, T0 + 60 * min);
  assert.equal(L.elapsedMs(s, T0 + 75 * min), 25 * min);
});
t('pause, resume and the last-seen mark only act in the right state', () => {
  const run = L.startTimer('inter', 'Law', '', T0, 'a');
  assert.equal(L.resumeTimer(run, T0 + 5), run);
  const paused = L.pauseTimer(run, T0 + min);
  assert.equal(L.pauseTimer(paused, T0 + 2 * min), paused);
  assert.equal(L.heartbeat(paused, T0 + 9 * min), paused);
  assert.equal(L.heartbeat(run, T0 + 9 * min).seen, T0 + 9 * min);
  assert.equal(L.heartbeat(run, T0 - 5), run); // never moves back
  assert.equal(L.elapsedMs(L.idleTimer(), T0), 0);
});
t('a clock set backwards never gives negative time', () => {
  const s = L.startTimer('inter', 'Law', '', T0, 'a');
  assert.equal(L.elapsedMs(s, T0 - 3 * min), 0);
  const p = L.pauseTimer(s, T0 - 3 * min);
  assert.equal(L.elapsedMs(p, T0), 0);
  assert.deepEqual(L.minutesByDate(L.segmentsUntil(p, T0)), []);
});
t('elapsed time survives a reload because it comes from timestamps', () => {
  let s = L.startTimer('inter', 'Law', 'Ch 3', T0, 'a');
  s = L.pauseTimer(s, T0 + 20 * min);
  const back = L.sanitizeTimer(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  assert.equal(L.elapsedMs(back, T0 + 999 * min), 20 * min);
  const run = L.startTimer('inter', 'Law', '', T0, 'b');
  assert.equal(L.elapsedMs(L.sanitizeTimer(JSON.parse(JSON.stringify(run))), T0 + 42 * min), 42 * min);
});
t('damaged saved state turns into a safe idle timer', () => {
  for (const bad of [null, undefined, 5, 'x', [], {}, { status: 'running' }, { status: 'running', subject: '   ', runFrom: 5, startedAt: 5 }, { status: 'weird', subject: 'Law' }, { status: 'running', subject: 'Law' }])
    assert.equal(L.sanitizeTimer(bad).status, 'idle', JSON.stringify(bad));
  const odd = L.sanitizeTimer({ status: 'running', subject: ' Law ', startedAt: T0, segments: [{ from: 5, to: 2 }, { from: 'a' }, { from: T0, to: T0 + min }], topic: 'a;b' + 'x'.repeat(200), level: 'nope' }, 'final');
  assert.equal(odd.status, 'paused'); // "running" without a run start cannot be trusted, so no time is invented
  assert.equal(odd.level, 'final'); assert.equal(odd.subject, 'Law'); assert.equal(odd.segments.length, 1);
  assert.ok(!odd.topic.includes(';')); assert.ok(odd.topic.length <= 140);
  assert.equal(L.elapsedMs(odd, T0 + 99 * min), min);
});
t('coming back after a long time away is noticed, and can be skipped', () => {
  let s = L.startTimer('inter', 'Law', '', T0, 'a');
  s = L.heartbeat(s, T0 + 30 * min);
  const a = L.awayInfo(s, T0 + 600 * min);
  assert.equal(a.away, true); assert.equal(a.note, true); assert.equal(a.untilSeen, 30 * min); assert.equal(a.all, 600 * min); assert.equal(a.gone, 570 * min);
  assert.equal(L.awayInfo(s, T0 + 35 * min).note, false); // five minutes away is nothing
  assert.equal(L.awayInfo(s, T0 + 40 * min).note, false); // exactly ten minutes is still nothing
  assert.equal(L.awayInfo(s, T0 + 40 * min + 1).note, true);
  const hour = L.awayInfo(s, T0 + 100 * min); // an hour or two in another app is just studying: counted, noted, not asked
  assert.equal(hour.note, true); assert.equal(hour.away, false); assert.equal(hour.all, 100 * min);
  assert.equal(L.awayInfo(s, T0 + 30 * min + 3 * 60 * min).away, false); // exactly three hours is still fine
  assert.equal(L.awayInfo(s, T0 + 30 * min + 3 * 60 * min + 1).away, true);
  const skipped = L.skipAway(s, T0 + 100 * min); // "no, skip that time"
  assert.equal(L.elapsedMs(skipped, T0 + 100 * min), 30 * min); assert.equal(L.elapsedMs(skipped, T0 + 110 * min), 40 * min);
  assert.equal(skipped.status, 'running'); assert.equal(L.awayInfo(skipped, T0 + 101 * min).note, false);
  const p = L.pauseTimer(s, T0 + 30 * min);
  assert.equal(L.awayInfo(p, T0 + 9999 * min).away, false); // a paused timer cannot run away
  assert.equal(L.skipAway(p, T0 + 99 * min), p);
  assert.equal(L.stalePaused(p, T0 + 30 * min + 7 * 60 * min), true); assert.equal(L.stalePaused(p, T0 + 2 * 60 * min), false);
});
t('too short is thrown away, very long asks first', () => {
  assert.equal(L.classifyStop(29_999), 'discard'); assert.equal(L.classifyStop(30_000), 'ok');
  assert.equal(L.classifyStop(6 * 3600_000), 'ok'); assert.equal(L.classifyStop(6 * 3600_000 + 1), 'long');
});
t('a session can be cut at a chosen time (the "until last seen" choice)', () => {
  let s = L.startTimer('inter', 'Law', '', T0, 'a'); s = L.pauseTimer(s, T0 + 20 * min); s = L.resumeTimer(s, T0 + 30 * min);
  assert.equal(L.planSession(s, T0 + 100 * min).ms, 90 * min);
  assert.equal(L.planSession(s, T0 + 45 * min).ms, 35 * min);
  assert.equal(L.planSession(s, T0 + 25 * min).ms, 20 * min); // cut while paused
  assert.deepEqual(L.planSession(s, T0 + 45 * min).days, [{ date: day(28), minutes: 35 }]);
  assert.equal(L.planSession(s, T0 + 45 * min).endedAt, T0 + 45 * min);
  assert.equal(L.planSession(L.idleTimer(), T0).ms, 0);
});
t('the topic can change while the clock runs without touching the time', () => {
  const s = L.startTimer('inter', 'Law', 'Ch 1', T0, 'a');
  const r = L.retopic(s, '  Ch 2; mocks ');
  assert.equal(r.topic, 'Ch 2, mocks'); assert.equal(L.elapsedMs(r, T0 + 5 * min), 5 * min); assert.equal(L.retopic(L.idleTimer(), 'x').topic, '');
});

console.log('Study timer: days');
t('a session on one day is whole minutes on that day', () => {
  assert.deepEqual(L.minutesByDate([{ from: at(28, 9), to: at(28, 9, 45) }]), [{ date: day(28), minutes: 45 }]);
  assert.deepEqual(L.minutesByDate([{ from: at(28, 9), to: at(28, 9, 10) }, { from: at(28, 11), to: at(28, 11, 20) }]), [{ date: day(28), minutes: 30 }]);
});
t('midnight splits a session between two days (and three, for a very long one)', () => {
  assert.deepEqual(L.minutesByDate([{ from: at(28, 23, 30), to: at(29, 0, 30) }]), [{ date: day(28), minutes: 30 }, { date: day(29), minutes: 30 }]);
  assert.deepEqual(L.minutesByDate([{ from: at(28, 22), to: at(30, 2) }]), [{ date: day(28), minutes: 120 }, { date: day(29), minutes: 1440 }, { date: day(30), minutes: 120 }]);
});
t('rounding never loses or gains a minute across midnight', () => {
  // 20 s before midnight + 50 s after = 70 s, which is 1 minute, given to the side that has more of it
  assert.deepEqual(L.minutesByDate([{ from: at(28, 23, 59, 40), to: at(29, 0, 0, 50) }]), [{ date: day(29), minutes: 1 }]);
  const r = L.minutesByDate([{ from: at(28, 23, 58, 30), to: at(29, 0, 1, 30) }]);
  assert.equal(r.reduce((a, x) => a + x.minutes, 0), 3);
});
t('the minutes always add up to the rounded total, for any mix of segments', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 400; i++) {
    const segs = []; let cur = at(26, 12) + Math.floor(rnd() * 20 * 3600_000);
    for (let k = 0, n2 = 1 + Math.floor(rnd() * 4); k < n2; k++) { const len = Math.floor(rnd() * 30 * 3600_000); segs.push({ from: cur, to: cur + len }); cur += len + Math.floor(rnd() * 5 * 3600_000); }
    const total = segs.reduce((a, g) => a + (g.to - g.from), 0);
    assert.equal(L.minutesByDate(segs).reduce((a, x) => a + x.minutes, 0), Math.round(total / 60000), JSON.stringify(segs));
  }
});
t('a day with a clock change still adds up', () => {
  const prev = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    const a = new Date(2026, 2, 7, 23, 0).getTime(), b = new Date(2026, 2, 8, 3, 30).getTime();
    assert.equal(b - a, 3.5 * 3600_000); // 02:00 to 03:00 does not exist, so 4.5 clock hours are 3.5 real ones
    assert.deepEqual(L.minutesByDate([{ from: a, to: b }]), [{ date: '2026-03-07', minutes: 60 }, { date: '2026-03-08', minutes: 150 }]);
  } finally { process.env.TZ = prev; }
});

console.log('Study timer: merging into the log');
const put = (log, subject, minutes, topic = '') => { const r = L.applyMinutes(log, log.date, subject, topic, minutes); assert.ok(r && r.ok, subject); return r.log; };
t('timing the same subject several times in a day adds to one entry', () => {
  let l = fresh();
  l = put(l, 'Law', 30); l = put(l, 'Audit', 20); l = put(l, 'Law', 25); l = put(l, 'Law', 25);
  assert.equal(sl(l, 1).subject, 'Law'); assert.equal(sl(l, 1).hours, 1.3333);
  assert.equal(sl(l, 2).subject, 'Audit'); assert.equal(sl(l, 2).hours, 0.3333);
  assert.equal(sl(l, 3).subject, ''); assert.equal(Math.round(L.logHours(l) * 60), 100);
});
t('the same subject in another spelling still merges', () => {
  let l = put(fresh(), 'Auditing and Assurance', 30);
  l = put(l, '  auditing   and assurance ', 15);
  assert.equal(sl(l, 1).hours, 0.75); assert.equal(sl(l, 1).subject, 'Auditing and Assurance'); assert.equal(sl(l, 2).subject, '');
});
t('a new subject takes the first free slot, up to six a day', () => {
  let l = fresh();
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach((s, i) => { l = put(l, s, 10); assert.equal(L.slotOfSubject(l, s), i + 1); });
  const seventh = L.applyMinutes(l, l.date, 'G', '', 10);
  assert.equal(seventh.ok, false); assert.equal(seventh.log, l); assert.equal(seventh.trimmedMinutes, 10);
  const again = L.applyMinutes(l, l.date, 'c', '', 10); // a subject already in the day still works when the day is full
  assert.equal(again.ok, true); assert.equal(sl(again.log, 3).hours, 0.3333);
});
t('a gap in the day is filled before a later slot is used', () => {
  let l = L.withSlot(L.withSlot(fresh(), 1, { subject: 'A', hours: 1 }), 3, { subject: 'C', hours: 1 });
  l = put(l, 'B', 30); assert.equal(L.slotOfSubject(l, 'B'), 2);
});
t('a day never passes 24 hours and the overflow is reported', () => {
  const l = L.withSlot(fresh(), 1, { subject: 'Law', hours: 23 });
  let r = L.applyMinutes(l, l.date, 'Audit', '', 90);
  assert.equal(r.addedMinutes, 60); assert.equal(r.trimmedMinutes, 30); assert.equal(L.logHours(r.log), 24);
  const full = r.log; r = L.applyMinutes(full, l.date, 'Law', '', 10);
  assert.equal(r.addedMinutes, 0); assert.equal(r.trimmedMinutes, 10); assert.equal(r.log, full);
});
t('a topic is added once, kept short, and never breaks the separator', () => {
  let l = put(fresh(), 'Law', 10, 'Ch 3: Contract');
  l = put(l, 'Law', 10, 'ch 3: contract'); // the same topic again is not repeated
  l = put(l, 'Law', 10, 'Ch 4; Ch 5'); // semicolons become commas
  assert.equal(sl(l, 1).topic, 'Ch 3: Contract; Ch 4, Ch 5');
  const long = put(l, 'Law', 10, 'x'.repeat(140)); // does not fit: the time still counts, the topic is skipped
  assert.equal(sl(long, 1).topic, sl(l, 1).topic); assert.equal(sl(long, 1).hours, 0.6667);
  assert.equal(L.mergeTopic('', 'x'.repeat(300)).text.length, 140);
});
t('hours never drift: 25 minutes three times is exactly 1.25', () => {
  let l = fresh(); for (let i = 0; i < 3; i++) l = put(l, 'Law', 25);
  assert.equal(sl(l, 1).hours, 1.25);
  let m = fresh(); for (let i = 0; i < 12; i++) m = put(m, 'Tax', 20);
  assert.equal(sl(m, 1).hours, 4);
});
t('hours already in the log (typed by hand) are kept and added to', () => {
  const l = L.withSlot(fresh(), 1, { subject: 'Law', hours: 1.5, topic: 'Ch 1', target: 3 });
  const r = L.applyMinutes(l, l.date, 'Law', '', 30);
  assert.equal(sl(r.log, 1).hours, 2); assert.equal(sl(r.log, 1).target, 3); assert.equal(sl(r.log, 1).topic, 'Ch 1');
});
t('applying never changes the log it was given', () => {
  const l = put(fresh(), 'Law', 10); const copy = JSON.stringify(l);
  L.applyMinutes(l, l.date, 'Law', 'x', 20); L.applyMinutes(l, l.date, 'Audit', 'x', 20);
  assert.equal(JSON.stringify(l), copy);
});
t('nothing is added for an empty subject or no time, and a first session creates the day', () => {
  assert.equal(L.applyMinutes(fresh(), day(28), '  ', '', 10), null);
  assert.equal(L.applyMinutes(fresh(), day(28), 'Law', '', 0), null);
  assert.equal(L.applyMinutes(fresh(), day(28), 'Law', '', -5), null);
  const r = L.applyMinutes(undefined, day(28), 'Law', '', 45);
  assert.equal(r.created, true); assert.equal(r.log.id, day(28)); assert.equal(r.log.date, day(28)); assert.equal(sl(r.log, 1).hours, 0.75);
});
t('compactLog removes gaps and keeps targets and topics', () => {
  const l = L.withSlot(L.withSlot(fresh(), 2, { subject: 'B', hours: 1, topic: 'x', target: 2 }), 5, { subject: 'E', hours: 2 });
  const c = L.compactLog(l);
  assert.deepEqual([1, 2, 3].map((i) => sl(c, i).subject), ['B', 'E', '']);
  assert.equal(sl(c, 1).target, 2); assert.equal(sl(c, 1).topic, 'x'); assert.equal(c.id, l.id); assert.equal(c.subject5, undefined);
});

console.log('Study timer: saving, undo and history');
const mem = (init = {}) => {
  const m = new Map(Object.entries(init));
  const mutate = (date, fn) => {
    const next = fn(m.get(date));
    if (!next) return null;
    const empty = !L.SLOTS.some((s) => L.getSlot(next, s).subject) && L.logHours(next) === 0; // same rule as saveStudyLog
    if (empty) m.delete(date); else m.set(date, next);
    return next;
  };
  return { m, mutate };
};
const session = (subject, minutes, topic = '', id = 's') => {
  const st = L.startTimer('inter', subject, topic, at(28, 9), id);
  return { st, plan: L.planSession(st, at(28, 9) + minutes * min) };
};
t('the key scenario: Law, Audit, Law, Law in one day, then taking them back', () => {
  const { m, mutate } = mem();
  const go = (subject, minutes, topic, id) => { const { st, plan } = session(subject, minutes, topic, id); return L.commitSession(st, plan, mutate); };
  const s1 = go('Law', 55, 'Ch 3', 's1'), s2 = go('Audit', 20, '', 's2'), s3 = go('Law', 45, 'Ch 4', 's3'), s4 = go('law', 10, 'Ch 3', 's4');
  const d = m.get(day(28));
  assert.equal(sl(d, 1).subject, 'Law'); assert.equal(Math.round(sl(d, 1).hours * 60), 110); assert.equal(sl(d, 1).topic, 'Ch 3; Ch 4');
  assert.equal(sl(d, 2).subject, 'Audit'); assert.equal(Math.round(sl(d, 2).hours * 60), 20); assert.equal(sl(d, 3).subject, '');
  assert.deepEqual([s1, s2, s3, s4].map((s) => L.sessionMinutes(s)), [55, 20, 45, 10]);
  L.revertSession(s3, mutate); // take the third back: the first and last stay
  assert.equal(Math.round(sl(m.get(day(28)), 1).hours * 60), 65); assert.equal(sl(m.get(day(28)), 1).topic, 'Ch 3');
  L.revertSession(s4, mutate); // its topic was already there, so nothing is removed
  assert.equal(Math.round(sl(m.get(day(28)), 1).hours * 60), 55); assert.equal(sl(m.get(day(28)), 1).topic, 'Ch 3');
  L.revertSession(s1, mutate); L.revertSession(s2, mutate); // everything back: the day is empty and gone
  assert.equal(m.size, 0);
});
t('undo takes back only what the session added, even after the day was edited', () => {
  const { m, mutate } = mem();
  const { st, plan } = session('Law', 25, 'Ch 1', 'x'); const s = L.commitSession(st, plan, mutate);
  m.set(day(28), L.withSlot(m.get(day(28)), 1, { hours: sl(m.get(day(28)), 1).hours + 1 })); // an hour added by hand
  L.revertSession(s, mutate);
  const d = m.get(day(28));
  assert.equal(Math.round(sl(d, 1).hours * 60), 60); assert.equal(sl(d, 1).subject, 'Law'); assert.equal(sl(d, 1).topic, '');
});
t('undo after the hours were cut down clears the entry instead of going negative', () => {
  const { m, mutate } = mem();
  const { st, plan } = session('Law', 40, '', 'x'); const s = L.commitSession(st, plan, mutate);
  m.set(day(28), L.withSlot(m.get(day(28)), 1, { hours: 0.25 }));
  L.revertSession(s, mutate);
  assert.equal(m.size, 0);
});
t('undo when the day or the entry is gone does nothing', () => {
  const { m, mutate } = mem();
  const { st, plan } = session('Law', 40, '', 'x'); const s = L.commitSession(st, plan, mutate);
  m.set(day(28), L.withSlot(fresh(), 1, { subject: 'Audit', hours: 2 }));
  L.revertSession(s, mutate);
  assert.equal(sl(m.get(day(28)), 1).hours, 2);
  m.delete(day(28)); L.revertSession(s, mutate); assert.equal(m.size, 0);
});
t('undo keeps an entry that was there before or has a target', () => {
  const { m, mutate } = mem({ [day(28)]: L.withSlot(fresh(), 1, { subject: 'Law', hours: 0, target: 2 }) });
  const { st, plan } = session('Law', 30, '', 'x'); const s = L.commitSession(st, plan, mutate);
  assert.equal(s.parts[0].created, false); assert.equal(sl(m.get(day(28)), 1).hours, 0.5);
  L.revertSession(s, mutate);
  const d = m.get(day(28)); assert.equal(sl(d, 1).subject, 'Law'); assert.equal(sl(d, 1).hours, 0); assert.equal(sl(d, 1).target, 2);
});
t('a session across midnight is saved to both days and taken back from both', () => {
  const { m, mutate } = mem();
  const st = L.startTimer('inter', 'Costing', '', at(28, 23, 30), 'x');
  const s = L.commitSession(st, L.planSession(st, at(29, 0, 30)), mutate);
  assert.deepEqual(s.parts.map((p) => [p.date, p.minutes]), [[day(28), 30], [day(29), 30]]);
  assert.equal(Math.round(sl(m.get(day(29)), 1).hours * 60), 30);
  L.revertSession(s, mutate); assert.equal(m.size, 0);
});
t('a full day is reported, not hidden, and undo restores it exactly', () => {
  const { m, mutate } = mem({ [day(28)]: L.withSlot(fresh(), 1, { subject: 'Law', hours: 23.5 }) });
  const { st, plan } = session('Audit', 90, '', 'x'); const s = L.commitSession(st, plan, mutate);
  assert.equal(s.parts[0].minutes, 30); assert.equal(s.parts[0].want, 90); assert.equal(L.logHours(m.get(day(28))), 24);
  L.revertSession(s, mutate); assert.equal(L.logHours(m.get(day(28))), 23.5);
});
t('with no free slot the minutes wait, and are added later once a slot is free', () => {
  const six = ['A', 'B', 'C', 'D', 'E', 'F'].reduce((l, s, i) => L.withSlot(l, i + 1, { subject: s, hours: 1 }), fresh());
  const { m, mutate } = mem({ [day(28)]: six });
  const { st, plan } = session('Tax', 40, 'GST', 'x'); let s = L.commitSession(st, plan, mutate);
  assert.equal(s.parts[0].logged, false); assert.equal(L.sessionMinutes(s), 0); assert.equal(L.sessionPending(s), 40);
  assert.equal(L.logHours(m.get(day(28))), 6); // nothing written, nothing lost
  s = L.retryPending(s, mutate); assert.equal(s.parts[0].logged, false); // still full
  m.set(day(28), L.withSlot(m.get(day(28)), 6, { subject: '', hours: 0 })); // the user frees a slot
  s = L.retryPending(s, mutate);
  assert.equal(s.parts[0].logged, true); assert.equal(L.sessionMinutes(s), 40); assert.equal(L.slotOfSubject(m.get(day(28)), 'Tax'), 6);
  L.revertSession(s, mutate); assert.equal(L.slotOfSubject(m.get(day(28)), 'Tax'), 0);
});
t('saving the same finished session twice does not add the time twice', () => {
  const { m, mutate } = mem();
  const { st, plan } = session('Law', 30, '', 'same');
  const s1 = L.commitSession(st, plan, mutate);
  const list = L.pushSession(L.pushSession([], s1), s1);
  assert.equal(list.length, 1);
  assert.equal(L.sessionMinutesOn(s1, day(28)), 30); assert.equal(L.sessionMinutesOn(s1, day(29)), 0);
  assert.equal(Math.round(sl(m.get(day(28)), 1).hours * 60), 30);
});
t('history keeps the newest first, one entry per session, at most 300', () => {
  const mk = (id) => ({ id, level: 'inter', subject: 'Law', topic: '', startedAt: 1, endedAt: 2, ms: 1, parts: [{ date: day(28), want: 1, minutes: 1, topicAdded: '', created: false, logged: true }] });
  let h = []; for (let i = 0; i < 305; i++) h = L.pushSession(h, mk('s' + i));
  assert.equal(h.length, 300); assert.equal(h[0].id, 's304');
  h = L.pushSession(h, mk('s250')); assert.equal(h.length, 300); assert.equal(h[0].id, 's250'); assert.equal(h.filter((x) => x.id === 's250').length, 1);
});
t('stored history is cleaned: junk is dropped, good entries survive', () => {
  const good = { id: 'a', level: 'inter', subject: 'Law', topic: 't', startedAt: 5, endedAt: 9, ms: 4, parts: [{ date: day(28), want: 10, minutes: 10, topicAdded: '', created: true, logged: true }] };
  const out = L.sanitizeSessions([good, null, 3, { id: 1 }, { id: 'b', subject: 'x', parts: [] }, { id: 'c', subject: 'x', parts: [{ date: 'nope' }] }, { ...good, id: 'd', level: 'zzz' }]);
  assert.deepEqual(out.map((x) => x.id), ['a', 'd']); assert.equal(out[1].level, 'inter'); assert.deepEqual(out[0], good);
  assert.deepEqual(L.sanitizeSessions('x'), []);
});

console.log('Study timer: words and numbers');
t('the clock reads like a clock', () => {
  assert.equal(L.fmtClock(0), '00:00'); assert.equal(L.fmtClock(65_000), '01:05'); assert.equal(L.fmtClock(3_725_000), '1:02:05');
  assert.equal(L.fmtClock(-500), '00:00'); assert.equal(L.fmtClock(59_999), '00:59'); assert.equal(L.fmtClock(36_000_000), '10:00:00');
});
t('minutes read as hours and minutes', () => {
  assert.equal(L.fmtMinutes(0), '0m'); assert.equal(L.fmtMinutes(45), '45m'); assert.equal(L.fmtMinutes(60), '1h');
  assert.equal(L.fmtMinutes(65), '1h 5m'); assert.equal(L.fmtMinutes(125.4), '2h 5m');
});
t('milestones: the caption follows the clock, and a crossing is reported once', () => {
  assert.equal(L.milestoneFor(0).at, 0); assert.equal(L.milestoneFor(26 * min).at, 25); assert.equal(L.milestoneFor(60 * min).at, 60); assert.equal(L.milestoneFor(500 * min).at, 180);
  assert.equal(L.milestoneCrossed(24 * min, 25 * min + 1)?.at, 25);
  assert.equal(L.milestoneCrossed(25 * min, 30 * min), null);
  assert.equal(L.milestoneCrossed(0, 100 * min)?.at, 90); // a long gap reports the furthest one
  assert.equal(L.milestoneCrossed(10 * min, 5 * min), null);
});
t('interval chime: counts the marks passed between two readings', () => {
  assert.equal(L.marksCrossed(14 * min, 16 * min, 15), 1); assert.equal(L.marksCrossed(0, 46 * min, 15), 3); assert.equal(L.marksCrossed(16 * min, 29 * min, 15), 0);
  assert.equal(L.marksCrossed(0, 99 * min, 0), 0); assert.equal(L.marksCrossed(30 * min, 10 * min, 15), 0);
});

console.log('Motion governor');
t('a frame window is summarised, and gaps from a hidden tab are ignored', () => {
  assert.equal(L.summarise(Array(10).fill(16.7)), null);
  const s = L.summarise([...Array(60).fill(16.7), 400, 1200]);
  assert.equal(s.n, 60); assert.ok(Math.abs(s.fps - 59.9) < 0.2 && s.median === 16.7);
  const slow = L.summarise([...Array(80).fill(16.7), ...Array(20).fill(40)]);
  assert.equal(slow.p90, 40);
});
t('verdicts: smooth is good, a steady drop below ~52 fps is bad, in between is ok', () => {
  assert.equal(L.verdictOf({ n: 60, median: 16.7, p90: 16.9, fps: 60 }), 'good');
  assert.equal(L.verdictOf({ n: 60, median: 8.3, p90: 9, fps: 120 }), 'good');
  assert.equal(L.verdictOf({ n: 60, median: 20, p90: 22, fps: 50 }), 'bad');
  assert.equal(L.verdictOf({ n: 60, median: 16.7, p90: 40, fps: 60 }), 'bad');
  assert.equal(L.verdictOf({ n: 60, median: 18, p90: 24, fps: 55 }), 'ok');
});
t('auto steps down after two bad windows in a row, and one good window in between resets the count', () => {
  let g = L.newGov('full');
  g = L.judge(g, 'bad'); assert.equal(g.level, 'full');
  g = L.judge(g, 'ok'); g = L.judge(g, 'bad'); assert.equal(g.level, 'full');
  g = L.judge(g, 'bad'); assert.equal(g.level, 'calm');
  g = L.judge(g, 'bad'); g = L.judge(g, 'bad'); assert.equal(g.level, 'still');
  g = L.judge(g, 'bad'); g = L.judge(g, 'bad'); assert.equal(g.level, 'still'); // nothing lower
});
t('auto steps back up only after three good windows, and asks for more proof each time it falls again', () => {
  let g = L.newGov('calm');
  g = L.judge(g, 'good'); g = L.judge(g, 'good'); assert.equal(g.level, 'calm');
  g = L.judge(g, 'good'); assert.equal(g.level, 'full'); assert.equal(g.raised, true);
  g = L.judge(g, 'bad'); g = L.judge(g, 'bad'); assert.equal(g.level, 'calm'); assert.equal(g.needGood, 6);
  for (let i = 0; i < 5; i++) g = L.judge(g, 'good'); assert.equal(g.level, 'calm');
  g = L.judge(g, 'good'); assert.equal(g.level, 'full');
  for (let k = 0; k < 6; k++) { g = L.judge(g, 'bad'); g = L.judge(g, 'bad'); for (let i = 0; i < g.needGood; i++) g = L.judge(g, 'good'); }
  assert.ok(g.needGood <= 12);
  g = L.newGov('full'); g = L.judge(g, 'good'); g = L.judge(g, 'good'); g = L.judge(g, 'good'); assert.equal(g.level, 'full'); // already at the top
});

console.log('Voyage: islands, lanterns and fog');
const VSUBJ = (id, name, abbrev, n, marks = 100, accent = 'cyan') => ({ id, name, abbrev, paperNumber: n, group: 'group1', marks, accent });
const AC = VSUBJ('ac', 'Advanced Accounting', 'AC', 1);
const LAW = VSUBJ('law', 'Corporate & Other Laws', 'LAW', 2, 100, 'violet');
const isl = (hours, plan = [], last = null, subject = AC) => L.buildIsland({ subject, hours, plan, lastStudied: last }, TODAY);
const vtopics = (n, done, h = 2) => Array.from({ length: n }, (_, i) => ({ subject: AC.name, targetHours: h, completed: i < done }));
t('an untouched island is uncharted and thick with fog', () => {
  const i = isl(0); assert.equal(i.state, 'uncharted'); assert.equal(i.progress, 0); assert.equal(i.fog, 0.95); assert.deepEqual(i.lanterns, { lit: 0, total: 8 });
});
t('with no plan, hours clear the fog: 80 h is a cleared island, 40 h is half', () => {
  assert.equal(isl(40, [], '2026-10-28').progress, 0.5); assert.equal(isl(40, [], '2026-10-28').lanterns.lit, 4);
  const full = isl(80, [], '2026-10-28'); assert.equal(full.state, 'cleared'); assert.equal(full.fog, 0); assert.equal(full.lanterns.lit, 8);
  assert.equal(isl(120, [], '2026-10-28').progress, 1);
});
t('one hour short of cleared never shows every lantern lit', () => {
  const i = isl(79, [], '2026-10-28'); assert.equal(i.state, 'exploring'); assert.equal(i.lanterns.lit, 7);
});
t('with a plan, ticked chapters light the lanterns and set the progress', () => {
  const i = isl(0, vtopics(10, 3)); assert.equal(i.basis, 'chapters'); assert.equal(i.progress, 0.3); assert.deepEqual(i.lanterns, { lit: 3, total: 10 }); assert.equal(i.targetHours, 20);
});
t('with a plan, hours clear fog up to 85% only; the last part needs ticked chapters', () => {
  assert.ok(Math.abs(isl(10, vtopics(10, 0), '2026-10-28').progress - 0.425) < 1e-9);
  assert.ok(Math.abs(isl(400, vtopics(10, 0), '2026-10-28').progress - 0.85) < 1e-9);
  assert.equal(isl(0, vtopics(10, 10)).state, 'cleared');
  assert.equal(isl(400, vtopics(10, 9), '2026-10-28').progress, 0.9 > 0.85 ? 0.9 : 0.85);
});
t('lanterns: capped at 12, and a single ticked chapter always lights one', () => {
  assert.equal(isl(0, vtopics(40, 0)).lanterns.total, 12);
  assert.equal(isl(5, vtopics(40, 1), '2026-10-28').lanterns.lit, 1);
  const almost = isl(0, vtopics(40, 39), '2026-10-28'); assert.equal(almost.lanterns.lit, 11);
});
t('an island nobody visited for 10 days fogs over again, and only when it is partly explored', () => {
  const a = isl(30, [], '2026-10-19'); // 10 days
  const b = isl(30, [], '2026-10-20'); // 9 days
  assert.equal(a.neglected, true); assert.equal(a.state, 'neglected'); assert.equal(b.neglected, false);
  assert.ok(a.fog > b.fog + 0.19);
  assert.equal(isl(80, [], '2026-09-01').neglected, false); // cleared islands stay clear
  assert.equal(isl(0, [], null).neglected, false);
});
t('last studied and the docked island come from the logs, ignoring case', () => {
  const logs = [log('2026-10-20', 2, 'advanced accounting'), log('2026-10-25', 1, 'Corporate & Other Laws', 'Advanced Accounting', 3)];
  const m = L.lastStudiedMap(logs);
  assert.equal(m.get('advanced accounting'), '2026-10-25'); assert.equal(m.get('corporate & other laws'), '2026-10-25');
  assert.equal(L.dockSubject(logs), 'Advanced Accounting'); // 3 h beats 1 h on the newest day
  assert.equal(L.dockSubject([]), null);
});
t('buildIslands orders by paper number and matches subject names loosely', () => {
  const list = L.buildIslands([LAW, AC], { 'ADVANCED ACCOUNTING': 40 }, [], [log('2026-10-27', 2, 'Advanced Accounting')], TODAY);
  assert.deepEqual(list.map((i) => i.abbrev), ['AC', 'LAW']); assert.equal(list[0].hours, 40); assert.equal(list[0].daysSince, 2); assert.equal(list[1].state, 'uncharted');
  assert.ok(Math.abs(L.levelProgress(list) - 0.25) < 1e-9); assert.equal(L.levelProgress([]), 0);
});

console.log('Voyage: the whole journey, wind, storms and the ghost ship');
t('a sea before the current level counts as sailed; the current one is sailed when marked', () => {
  assert.equal(L.seaStatus('foundation', 'inter', {}), 'sailed'); assert.equal(L.seaStatus('inter', 'inter', {}), 'current'); assert.equal(L.seaStatus('final', 'inter', {}), 'ahead');
  assert.equal(L.seaStatus('inter', 'inter', { inter: '2026-10-01' }), 'sailed'); assert.equal(L.seaStatus('final', 'foundation', { final: '2026-10-01' }), 'sailed');
});
t('journey fraction: one third per sea, the current sea counts by its islands', () => {
  assert.equal(L.journeyFraction('foundation', {}, 0), 0); assert.ok(Math.abs(L.journeyFraction('foundation', {}, 0.3) - 0.1) < 1e-9);
  assert.ok(Math.abs(L.journeyFraction('inter', {}, 0.5) - 0.5) < 1e-9); assert.ok(Math.abs(L.journeyFraction('final', {}, 0) - 2 / 3) < 1e-9);
  assert.equal(L.journeyFraction('final', { final: '2027-01-01' }, 0.2), 1);
  assert.equal(L.journeyFraction('inter', { inter: '2026-10-01' }, 0.9), 2 / 3); // marked cleared: progress no longer adds
  assert.equal(L.treasureWon({}), false); assert.equal(L.treasureWon({ final: '2027-05-01' }), true);
});
t('wind: tail when on pace, cross when within 20%, head when behind, calm when there is nothing to steer by', () => {
  assert.equal(L.windFor(5, 5).kind, 'tail'); assert.equal(L.windFor(5, 4).kind, 'cross'); assert.equal(L.windFor(5, 3.9).kind, 'head');
  assert.equal(L.windFor(0, 3).kind, 'calm'); assert.equal(L.windFor(NaN, 3).kind, 'calm'); assert.equal(L.windFor(Infinity, 3).kind, 'calm');
});
t('weather follows the mock score: 70 clear, 50 fair, 40 rough, below that a storm', () => {
  assert.equal(L.weatherOf(70), 'clear'); assert.equal(L.weatherOf(69.9), 'fair'); assert.equal(L.weatherOf(50), 'fair'); assert.equal(L.weatherOf(49.9), 'rough');
  assert.equal(L.weatherOf(40), 'rough'); assert.equal(L.weatherOf(39.9), 'storm'); assert.equal(L.weatherOf(0), 'storm');
});
t('storms: only the latest mock of each paper in the last 45 days counts, scored against that paper', () => {
  const mocks = [
    { id: '1', date: '2026-10-01', subject: 'Advanced Accounting', marks: 80, notes: '' },
    { id: '2', date: '2026-10-20', subject: 'advanced accounting', marks: 35, notes: '' },
    { id: '3', date: '2026-08-01', subject: 'Corporate & Other Laws', marks: 90, notes: '' },
    { id: '4', date: '2026-10-28', subject: 'Cooking', marks: 90, notes: '' },
    { id: '5', date: '2026-11-20', subject: 'Corporate & Other Laws', marks: 90, notes: '' },
  ];
  const s = L.stormsFor(mocks, [AC, LAW], TODAY);
  assert.equal(s.size, 1); const a = s.get('advanced accounting');
  assert.equal(a.marks, 35); assert.equal(a.weather, 'storm'); assert.equal(a.daysAgo, 9);
  assert.equal(L.stormsFor([{ id: 'x', date: '2026-10-28', subject: 'Direct Tax (DT)', marks: 20, notes: '' }], [VSUBJ('dt', 'Direct Tax (DT)', 'DT', 3, 50)], TODAY).get('direct tax (dt)').pct, 40); // 20 of 50
});
t('the ghost ship is the best Monday-to-Sunday week before this one', () => {
  const totals = { '2026-10-05': 5, '2026-10-06': 6, '2026-10-07': 7, '2026-10-12': 9, '2026-10-26': 8, '2026-10-27': 8 }; // this week starts 2026-10-26
  const b = L.bestWeek(totals, TODAY); assert.equal(b.hours, 18); assert.equal(b.start, '2026-10-05');
  assert.deepEqual(L.bestWeek({}, TODAY), { hours: 0, start: null });
  assert.equal(L.bestWeek({ '2026-10-28': 12 }, TODAY).hours, 0); // this week alone is not a record yet
});
t('the ghost race compares this week with your best week up to the same weekday', () => {
  const totals = { '2026-10-05': 5, '2026-10-06': 6, '2026-10-07': 7, '2026-10-09': 4, '2026-10-26': 8, '2026-10-27': 3, '2026-10-28': 1 }; // today is Thursday: Mon..Thu
  const r = L.ghostRace(totals, TODAY);
  assert.equal(r.day, 3); assert.equal(r.bestTotal, 22); assert.equal(r.ghost, 18); assert.equal(r.you, 12); assert.equal(r.ahead, false);
  assert.equal(L.ghostRace({ ...totals, '2026-10-29': 9 }, TODAY).ahead, true);
  const none = L.ghostRace({ '2026-10-27': 5 }, TODAY); assert.equal(none.bestTotal, 0); assert.equal(none.ghost, 0); assert.equal(none.you, 5);
});
t('islands are laid out in two staggered rows, centred, with no overlaps', () => {
  for (const c of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const p = L.layoutFor(c); assert.equal(p.length, c);
    for (const q of p) { assert.ok(q.x >= 100 && q.x <= 1100, `x ${q.x} for ${c}`); assert.ok(q.y > 200 && q.y < 520); }
    for (let i = 0; i < c; i++) for (let j = i + 1; j < c; j++) assert.ok(Math.hypot(p[i].x - p[j].x, (p[i].y - p[j].y) * 1.4) > 150, `islands ${i},${j} too close for ${c}`);
  }
  assert.deepEqual(L.layoutFor(0), []);
});

console.log('Voyage: saved state and the crew');
t('stored voyage state is repaired, never trusted', () => {
  const d = L.normaliseVoyage(null); assert.equal(d.shipName, L.DEFAULT_SHIP); assert.deepEqual(d.captain, L.DEFAULT_CAPTAIN); assert.deepEqual(d.cleared, {}); assert.equal(d.finaleSeen, false);
  const x = L.normaliseVoyage({ shipName: '   The   Long   Name That Goes On And On Forever  ', cleared: { inter: '2026-10-01', final: 'soon', bogus: '2026-10-01' }, captain: { skin: 99, hair: 2, hairColor: -1, coat: '3', accessory: 1.9 }, finaleSeen: 'yes' });
  assert.equal(x.shipName.length <= 26, true); assert.ok(!x.shipName.includes('  ')); assert.deepEqual(x.cleared, { inter: '2026-10-01' });
  assert.deepEqual(x.captain, { skin: L.DEFAULT_CAPTAIN.skin, hair: 2, hairColor: L.DEFAULT_CAPTAIN.hairColor, coat: 3, accessory: 1 }); assert.equal(x.finaleSeen, false);
  assert.equal(L.normaliseVoyage({ shipName: '   ' }).shipName, L.DEFAULT_SHIP);
});
const crewCtx = (o = {}) => ({
  wind: L.windFor(5, 5), daysLeft: 90, islands: [isl(40, [], '2026-10-28')], storms: [], streak: 0, freezes: 0, todayHours: 0, goal: 8, rankTitle: 'Bosun', totalXP: 1234, timerSubject: null, seed: 3, ...o,
});
t('the crew always say something sensible, in every situation', () => {
  const storm = { subject: 'Advanced Accounting', marks: 30, max: 100, pct: 30, weather: 'storm', date: '2026-10-20', daysAgo: 9 };
  const cases = [crewCtx(), crewCtx({ wind: L.windFor(6, 3) }), crewCtx({ wind: L.windFor(6, 5) }), crewCtx({ wind: L.windFor(0, 0) }), crewCtx({ daysLeft: -3 }),
    crewCtx({ storms: [storm] }), crewCtx({ storms: [{ ...storm, pct: 75, weather: 'clear' }] }), crewCtx({ islands: [isl(30, [], '2026-10-01')] }), crewCtx({ islands: [isl(0)] }),
    crewCtx({ timerSubject: 'Auditing' }), crewCtx({ todayHours: 9 }), crewCtx({ streak: 6, freezes: 2 }), crewCtx({ todayHours: 2 }), crewCtx({ islands: [] })];
  for (const c of cases) for (let seed = 0; seed < 6; seed++) {
    const lines = L.crewLines({ ...c, seed });
    for (const [who, ln] of Object.entries(lines)) {
      assert.equal(ln.who, who); assert.ok(typeof ln.text === 'string' && ln.text.length > 10 && ln.text.length < 260, `${who}: ${ln.text}`);
      assert.ok(!/undefined|NaN|\[object|Infinity/.test(ln.text), `${who}: ${ln.text}`);
    }
  }
});
t('the crew react to the real numbers', () => {
  const storm = { subject: 'Advanced Accounting', marks: 30, max: 100, pct: 30, weather: 'storm', date: '2026-10-20', daysAgo: 9 };
  assert.equal(L.crewLines(crewCtx({ wind: L.windFor(6, 3) })).odalys.expr, 'worry');
  assert.equal(L.crewLines(crewCtx({ wind: L.windFor(5, 6) })).odalys.expr, 'smile');
  assert.equal(L.crewLines(crewCtx({ storms: [storm] })).tally.expr, 'worry');
  assert.equal(L.crewLines(crewCtx({ storms: [{ ...storm, pct: 82, weather: 'clear' }] })).tally.expr, 'cheer');
  const brine = L.crewLines(crewCtx({ islands: [isl(30, [], '2026-10-10')] })).brine; assert.ok(brine.text.includes('AC') && brine.text.includes('19 days'));
  assert.ok(L.crewLines(crewCtx({ timerSubject: 'Auditing' })).saffron.text.includes('Auditing'));
  const a = L.crewLines(crewCtx({ seed: 4 })); const b = L.crewLines(crewCtx({ seed: 4 })); assert.deepEqual(a, b); // same day, same words
  assert.equal(L.daySeed('2026-10-29'), L.daySeed('2026-10-29'));
});

console.log('Voyage: words');
t('every rank has a Voyage name, in the same order, and plain words or the default look keep the everyday names', () => {
  assert.equal(L.VOYAGE_RANKS.length, L.RANK_TITLES.length);
  const voy = L.wordsFor('voyage', false), plain = L.wordsFor('voyage', true), base = L.wordsFor('default', false);
  L.RANK_TITLES.forEach((r, i) => { assert.equal(voy.rank(r), L.VOYAGE_RANKS[i], r); assert.equal(plain.rank(r), r); assert.equal(base.rank(r), r); });
  assert.equal(new Set(L.VOYAGE_RANKS).size, L.VOYAGE_RANKS.length);
  assert.equal(voy.rank('Some other title'), 'Some other title');
});
t('menu words turn nautical only in the Voyage world, and plain words switch them off', () => {
  const sec = { id: 'rewards', label: 'Rewards', short: 'Rewards' };
  assert.equal(L.wordsFor('voyage', false).section(sec).label, 'Treasure');
  assert.equal(L.wordsFor('voyage', true).section(sec).label, 'Rewards');
  assert.equal(L.wordsFor('default', false).section(sec).label, 'Rewards');
  assert.equal(L.wordsFor('voyage', true).voyage, true); assert.equal(L.wordsFor('default', false).voyage, false);
});

console.log('Sound kits');
{
  const fsp = await import('node:fs/promises');
  const src = await fsp.readFile(path.join(root, 'src/lib/sfx.ts'), 'utf8');
  const union = (re) => [...src.match(re)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
  const names = union(/export type SfxName =([^;]+);/);
  const kitIds = union(/export type KitId =([^;]+);/);
  const kits = {};
  for (const k of kitIds) kits[k] = { meta: JSON.parse(await fsp.readFile(path.join(root, `public/sfx/${k}.json`), 'utf8')), flac: await fsp.readFile(path.join(root, `public/sfx/${k}.flac`)) };
  t('every sound name has a definition (label, group, priority)', () => {
    assert.ok(names.length >= 41);
    for (const n of names) assert.ok(new RegExp(`^  ${n}: D\\(`, 'm').test(src), `no definition for ${n}`);
    assert.equal((src.match(/^  \w+: D\(/gm) || []).length, names.length);
  });
  t('every kit has a recording for every sound, and nothing extra', () => {
    for (const [k, { meta }] of Object.entries(kits)) {
      const have = Object.keys(meta.sounds).sort();
      assert.deepEqual(have, [...names].sort(), `kit ${k}`);
    }
  });
  t('each kit index matches its audio file', () => {
    for (const [k, { meta, flac }] of Object.entries(kits)) {
      assert.equal(flac.subarray(0, 4).toString('latin1'), 'fLaC', `${k}: not a FLAC file`);
      const w = flac.readBigUInt64BE(18); // sample rate (20 bits), channels-1 (3), bits-1 (5), total samples (36)
      const rate = Number(w >> 44n), channels = Number((w >> 41n) & 7n) + 1, total = Number(w & ((1n << 36n) - 1n));
      assert.equal(rate, meta.rate, `${k}: sample rate`); assert.equal(channels, 1, `${k}: mono`);
      const spans = Object.entries(meta.sounds).sort((a, b) => a[1][0] - b[1][0]);
      let end = 0;
      for (const [name, [start, dur]] of spans) {
        assert.ok(dur >= 0.04 && dur <= 3.2, `${k}.${name}: length ${dur}`);
        assert.ok(start >= end - 1e-6, `${k}.${name} overlaps the sound before it`);
        end = start + dur;
      }
      assert.ok(end * rate <= total + 2, `${k}: the index runs past the end of the audio`);
    }
  });
  const ctx = await fsp.readFile(path.join(root, 'src/context/StudyContext.tsx'), 'utf8');
  const types = await fsp.readFile(path.join(root, 'src/types.ts'), 'utf8');
  t('settings, types and the kit list all know the same kits', () => {
    const kitList = [...src.matchAll(/\{ id: '(\w+)', label: '/g)].map((m) => m[1]);
    assert.deepEqual(kitList, kitIds);
    const accepted = [...ctx.match(/if \((s\.sfxKit !== [^)]+)\) delete s\.sfxKit/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    assert.deepEqual(accepted, kitIds);
    const typed = [...types.match(/sfxKit\?: ([^;]+);/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    assert.deepEqual(typed, kitIds);
  });
}


// ───────────────────────────────────── iOS interface ─────────────────────────────────────
console.log('iOS interface');
{
  const { writeFile, readFile } = await import('node:fs/promises');
  const dir2 = await mkdtemp(path.join(tmpdir(), 'ca-test-ios-'));
  const entry2 = path.join(dir2, 'entry.ts');
  await writeFile(entry2, `
export * from ${JSON.stringify(path.join(root, 'src/lib/spring.ts'))};
export { isIos, bootUi } from ${JSON.stringify(path.join(root, 'src/lib/ui.ts'))};
export { sectionIcon, moreIcon, SECTIONS } from ${JSON.stringify(path.join(root, 'src/config/nav.ts'))};
export { sfx } from ${JSON.stringify(path.join(root, 'src/lib/sfx.ts'))};
`);
  await build({ entryPoints: [entry2], bundle: true, format: 'esm', platform: 'node', outfile: path.join(dir2, 'out.mjs'), logLevel: 'error' });
  const I = await import(pathToFileURL(path.join(dir2, 'out.mjs')).href);
  await rm(dir2, { recursive: true, force: true });
  const ta = async (name, fn) => { try { await fn(); n++; console.log('  ok  ' + name); } catch (e) { console.error('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; } };
  const put = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  const fakeHtml = () => ({ attrs: {}, getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; } });

  t('springs start at rest and arrive at the target', () => {
    for (const [name, spec] of Object.entries(I.SPRINGS)) {
      assert.equal(I.springAt(spec, 0), 0, name);
      assert.ok(Math.abs(I.springAt(spec, 3) - 1) < 1e-3, name + ' settles');
    }
  });
  t('a critically damped spring never overshoots, the springy ones do (bouncier means further)', () => {
    for (let ms = 0; ms <= 1500; ms += 5) assert.ok(I.springAt(I.SPRINGS.smooth, ms / 1000) <= 1 + 1e-9, 'smooth overshoots at ' + ms + 'ms');
    const o = (k) => I.overshootOf(I.SPRINGS[k]);
    assert.ok(o('smooth') <= 1 + 1e-9);
    assert.ok(o('snappy') > 1.005 && o('snappy') < o('press') && o('press') < o('bouncy'), [o('snappy'), o('press'), o('bouncy')].join(' '));
  });
  t('a spring that starts with speed leaves at that speed (this is what lets a flick carry on)', () => {
    const v0 = 4, dt = 1e-4;
    assert.ok(Math.abs(I.springAt(I.SPRINGS.press, dt, v0) / dt - v0) < 0.05, 'initial slope is v0');
    assert.ok(I.springAt(I.SPRINGS.snappy, 0.01, 6) > I.springAt(I.SPRINGS.snappy, 0.01, 0) * 3, 'a flick is well ahead of a spring from rest');
  });
  t('springCurve gives a linear() easing that starts at 0, ends at 1 and settles in a sensible time', () => {
    for (const spec of Object.values(I.SPRINGS)) {
      const c = I.springCurve(spec);
      assert.ok(c.easing.startsWith('linear(0, ') && c.easing.endsWith(', 1)'), c.easing.slice(0, 30));
      assert.equal(c.values.length, 56); assert.equal(c.values[0], 0); assert.equal(c.values.at(-1), 1);
      assert.ok(c.duration >= 300 && c.duration <= 1200 && c.duration % 10 === 0, 'duration ' + c.duration);
    }
    assert.equal(I.springCurve(I.SPRINGS.smooth, 0, 3).values.length, 8, 'at least 8 samples');
  });
  const iosCss = await readFile(path.join(root, 'src/styles/ios.css'), 'utf8');
  t('the spring tokens in ios.css are what spring.ts generates (run node tools/ios/springs.mjs if this fails)', () => {
    for (const [name, spec] of Object.entries(I.SPRINGS)) {
      const c = I.springCurve(spec, 0, I.TOKEN_POINTS);
      const e = iosCss.match(new RegExp(`--ios-spring-${name}:\\s*(linear\\([^;]*\\));`));
      const d = iosCss.match(new RegExp(`--ios-spring-${name}-d:\\s*(\\d+)ms;`));
      assert.ok(e && d, name + ' token is missing');
      assert.equal(e[1], c.easing, name + ' easing is stale');
      assert.equal(+d[1], c.duration, name + ' duration is stale');
    }
  });
  t('rubber band: nothing at the edge, follows the finger at first, then gets harder and never reaches the size', () => {
    assert.equal(I.rubber(0, 500), 0); assert.equal(I.rubber(-5, 500), 0);
    let prev = 0;
    for (let o = 10; o <= 5000; o += 10) { const r = I.rubber(o, 500); assert.ok(r > prev && r < 500, 'at ' + o); prev = r; }
    assert.ok(Math.abs(I.rubber(1, 100000) - 0.55) < 0.01, 'slope starts at the constant');
    assert.ok(I.rubber(400, 500) - I.rubber(300, 500) < I.rubber(100, 500) - I.rubber(0, 500), 'harder further out');
  });
  t('Velocity: pixels per millisecond over the last moments, zero after a pause, a reset or one sample', () => {
    const v = new I.Velocity();
    assert.equal(v.get(0), 0);
    v.push(5, 1000); assert.equal(v.get(1001), 0, 'one sample is no speed');
    for (let i = 1; i <= 5; i++) v.push(5 + i * 10, 1000 + i * 10);
    assert.ok(Math.abs(v.get(1052) - 1) < 1e-9, 'one pixel per millisecond');
    assert.equal(v.get(1050 + 200), 0, 'the finger stopped before it let go');
    v.reset(); assert.equal(v.get(1100), 0);
    const up = new I.Velocity(); up.push(0, 0); up.push(-30, 20);
    assert.ok(Math.abs(up.get(25) + 1.5) < 1e-9, 'upwards is negative');
    const old = new I.Velocity(); old.push(0, 0); old.push(100, 50); old.push(100, 200); old.push(130, 220);
    assert.ok(Math.abs(old.get(225) - 1.5) < 1e-9, 'old samples fall out of the window');
  });

  t('interface mode is classic only when <html data-ui> says so; anything else is the iOS look', () => {
    const el = fakeHtml();
    put('document', { documentElement: el, addEventListener() {} });
    try {
      assert.equal(I.isIos(), true, 'nothing set yet');
      el.setAttribute('data-ui', 'classic'); assert.equal(I.isIos(), false);
      el.setAttribute('data-ui', 'ios'); assert.equal(I.isIos(), true);
      el.setAttribute('data-ui', 'bogus'); assert.equal(I.isIos(), true);
    } finally { delete globalThis.document; }
    assert.equal(I.isIos(), true, 'no document at all (server side) is the default');
  });
  t('bootUi reads the saved setting and survives missing or broken data', () => {
    const el = fakeHtml(), store = {};
    put('document', { documentElement: el, addEventListener() {} });
    put('localStorage', { getItem: (k) => store[k] ?? null });
    try {
      store.ca_settings_v3 = JSON.stringify({ ui: 'classic' }); I.bootUi(); assert.equal(el.attrs['data-ui'], 'classic');
      store.ca_settings_v3 = JSON.stringify({ ui: 'nonsense' }); I.bootUi(); assert.equal(el.attrs['data-ui'], 'ios');
      store.ca_settings_v3 = '{not json'; I.bootUi(); assert.equal(el.attrs['data-ui'], 'ios');
      store.ca_settings_v3 = 'null'; I.bootUi(); assert.equal(el.attrs['data-ui'], 'ios');
      delete store.ca_settings_v3; I.bootUi(); assert.equal(el.attrs['data-ui'], 'ios');
    } finally { delete globalThis.document; delete globalThis.localStorage; }
  });
  const ctxSrc = await readFile(path.join(root, 'src/context/StudyContext.tsx'), 'utf8');
  const typesSrc = await readFile(path.join(root, 'src/types.ts'), 'utf8');
  const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8');
  t('the interface setting is typed, sanitised on load, applied to <html> and set before first paint', () => {
    assert.ok(/ui\?: 'ios' \| 'classic';/.test(typesSrc), 'typed');
    assert.ok(/if \(s\.ui !== 'ios' && s\.ui !== 'classic'\) delete s\.ui;/.test(ctxSrc), 'sanitised');
    assert.ok(/setAttribute\('data-ui', settings\.ui === 'classic' \? 'classic' : 'ios'\)/.test(ctxSrc), 'applied');
    assert.ok(/data-ui/.test(indexHtml), 'index.html sets it before the app loads');
  });
  t('menu icons: the classic icon in the classic look, an outline/filled pair in the iOS look', () => {
    assert.ok(I.SECTIONS.length >= 8);
    for (const s of I.SECTIONS) {
      assert.equal(I.sectionIcon(s, false, true), s.icon, s.id + ' classic active');
      assert.equal(I.sectionIcon(s, false, false), s.icon, s.id + ' classic idle');
      assert.notEqual(I.sectionIcon(s, true, true), I.sectionIcon(s, true, false), s.id + ' fills in when it is the current one');
    }
    assert.notEqual(I.moreIcon(true, true), I.moreIcon(true, false));
  });
  await ta('haptics: patterns by name, they follow the Vibration setting and two never pile up', async () => {
    const calls = [];
    put('navigator', { vibrate: (p) => { calls.push(p); return true; } });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      I.sfx.configure({ haptics: true });
      I.sfx.haptic('select'); assert.deepEqual(calls, [6]);
      I.sfx.haptic('heavy'); assert.equal(calls.length, 1, 'a second haptic within 40 ms is dropped');
      await wait(60);
      I.sfx.haptic('success'); assert.deepEqual(calls.at(-1), [10, 40, 18]);
      await wait(60);
      I.sfx.haptic('error'); assert.deepEqual(calls.at(-1), [18, 40, 18, 40, 26]);
      I.sfx.configure({ haptics: false }); await wait(60);
      I.sfx.haptic('heavy'); assert.equal(calls.length, 3, 'nothing when Vibration is off');
    } finally { I.sfx.configure({ haptics: true }); delete globalThis.navigator; }
  });
}


// ───────────────────────────── Lanternfell (the academy world) and the redrawn islands ─────────────────────────────
const fsm = await import('node:fs');
const zeroV = { grit: 0, care: 0, wit: 0, steadiness: 0 };
const pickAll = (v) => L.QUESTIONS.map((q) => q.answers.findIndex((a) => a.virtue === v));

console.log('Lanternfell: houses and choosing');
t('the four houses and four virtues pair up both ways, in one fixed order', () => {
  assert.deepEqual(L.HOUSE_ORDER, ['wolf', 'heron', 'fox', 'bear']);
  assert.deepEqual(L.VIRTUES, ['grit', 'care', 'wit', 'steadiness']);
  for (const v of L.VIRTUES) assert.equal(L.VIRTUE_OF[L.HOUSE_OF[v]], v);
  for (const h of L.HOUSE_ORDER) { assert.equal(L.HOUSES[h].id, h); assert.equal(L.HOUSE_OF[L.HOUSES[h].virtue], h); }
  assert.equal(new Set(L.HOUSE_ORDER.map((h) => L.HOUSES[h].name)).size, 4);
});
t('the three questions offer every virtue once, and an answer counts for the virtue it points to', () => {
  assert.equal(L.QUESTION_COUNT, 3); assert.equal(L.QUESTIONS.length, 3);
  for (const q of L.QUESTIONS) assert.deepEqual(q.answers.map((a) => a.virtue).sort(), [...L.VIRTUES].sort());
  assert.deepEqual(L.answerShares([null, null, null]), zeroV);
  for (const v of L.VIRTUES) assert.equal(L.answerShares(pickAll(v))[v], 100);
  const mixed = L.answerShares([pickAll('grit')[0], pickAll('care')[1], null]);
  assert.equal(mixed.grit, 50); assert.equal(mixed.care, 50); assert.equal(mixed.wit, 0);
});
t('a brand-new student with no data is chosen by their own answers alone', () => {
  for (const v of L.VIRTUES) {
    const c = L.chooseHouse(zeroV, pickAll(v), 0);
    assert.equal(c.house, L.HOUSE_OF[v]); assert.equal(c.close, false);
  }
});
t('measured virtues carry 60 percent and the answers 40; with no answers the numbers decide alone; too little data is ignored', () => {
  const measured = { grit: 0, care: 100, wit: 0, steadiness: 0 };
  const c = L.chooseHouse(measured, pickAll('grit'), 20);
  assert.equal(c.house, 'heron'); assert.equal(c.blended.care, 60); assert.equal(c.blended.grit, 40);
  const noAnswers = L.chooseHouse(measured, [null, null, null], 20);
  assert.equal(noAnswers.house, 'heron'); assert.equal(noAnswers.blended.care, 100);
  assert.equal(L.chooseHouse(measured, pickAll('grit'), 1).house, 'wolf', 'under three days of data the answers decide');
});
t('a dead heat is settled the same way every time, and is reported as close', () => {
  const a = L.chooseHouse(zeroV, [null, null, null], 0);
  assert.equal(a.house, 'wolf'); assert.equal(a.close, true);
  assert.deepEqual(L.chooseHouse(zeroV, [null, null, null], 0), a);
});
t('the weekly cup goes to the strongest virtue; an empty week wins nothing; a tie follows the house order', () => {
  assert.equal(L.weeklyCup(zeroV).winner, null);
  assert.equal(L.weeklyCup({ ...zeroV, wit: 40 }).winner, 'fox');
  assert.equal(L.weeklyCup({ grit: 30, care: 30, wit: 30, steadiness: 30 }).winner, 'wolf');
  assert.equal(L.weeklyCup({ grit: 10, care: 55, wit: 55, steadiness: 20 }).winner, 'heron');
});
t('a student may be chosen again a term (60 days) after the last Choosing', () => {
  assert.equal(L.canRechoose(null, TODAY), true); assert.equal(L.rechooseFrom(null), null);
  assert.equal(L.canRechoose('2026-09-01', '2026-10-30'), false);
  assert.equal(L.canRechoose('2026-09-01', '2026-10-31'), true);
  assert.equal(L.rechooseFrom('2026-09-01'), '2026-10-31');
});

console.log('Lanternfell: measuring the virtues');
const vInput = (logs, extra = {}) => ({ logs, mocks: [], chapters: { done: 0, total: 0 }, papers: 8, totalHours: logs.reduce((a, l) => a + l.hours1 + l.hours2, 0), goodDayHours: 6, today: TODAY, ...extra });
t('no study at all scores nothing and reports no days of data', () => {
  const m = L.scoreVirtues(vInput([]));
  assert.deepEqual(m.virtues, zeroV); assert.equal(m.daysOfData, 0);
});
t('studying more of the last 28 days raises steadiness; every score is a whole number from 0 to 100', () => {
  const at = (n) => L.scoreVirtues(vInput(days(L.addDays(TODAY, -(n - 1)), n, 4))).virtues;
  assert.ok(at(7).steadiness < at(14).steadiness && at(14).steadiness < at(21).steadiness);
  assert.equal(at(28).steadiness, 100);
  for (const n of [1, 7, 28]) for (const v of Object.values(at(n))) assert.ok(Number.isInteger(v) && v >= 0 && v <= 100);
});
t('a long run of good days builds grit; one huge day alone does not', () => {
  const run = L.scoreVirtues(vInput(days(L.addDays(TODAY, -13), 14, 7))).virtues.grit;
  const one = L.scoreVirtues(vInput([log(TODAY, 12)])).virtues.grit;
  assert.ok(run > 70, 'a fortnight of 7-hour days: ' + run); assert.ok(one < run, 'one day: ' + one);
});
t('recent mock marks lift care; a mock from months ago does not count', () => {
  const base = vInput(days(L.addDays(TODAY, -6), 7, 3));
  const none = L.scoreVirtues(base).virtues.care;
  const good = L.scoreVirtues({ ...base, mocks: [{ date: L.addDays(TODAY, -3), pct: 80 }] }).virtues.care;
  const old = L.scoreVirtues({ ...base, mocks: [{ date: L.addDays(TODAY, -90), pct: 80 }] }).virtues.care;
  assert.ok(good > none, `${good} > ${none}`); assert.equal(old, none);
});
t('touching more papers and closing chapters faster build wit', () => {
  const week = (subs) => subs.map((sub, i) => log(L.addDays(TODAY, -i), 3, sub));
  const narrow = L.scoreVirtues(vInput(week(['Accounting', 'Accounting', 'Accounting']))).virtues.wit;
  const wide = L.scoreVirtues(vInput(week(['Accounting', 'Laws', 'Costing', 'Audit', 'Tax', 'FM']))).virtues.wit;
  assert.ok(wide > narrow, `${wide} > ${narrow}`);
  const fast = L.scoreVirtues(vInput(week(['Accounting']), { chapters: { done: 30, total: 60 } })).virtues.wit;
  const slow = L.scoreVirtues(vInput(week(['Accounting']), { chapters: { done: 0, total: 60 } })).virtues.wit;
  assert.ok(fast > slow, `${fast} > ${slow}`);
});

console.log('Lanternfell: the grounds and the islands');
t('every paper of every level gets a building and an island; all ten of each are used; the school and the sea draw the same kind of place', () => {
  const sameKind = { counting: 'counting', statute: 'statute', orrery: 'orrery', market: 'market', tithe: 'tithe', toll: 'toll', foundry: 'foundry', watch: 'watch', vault: 'vault', maptower: 'chart' };
  const buildings = new Set(); const islands = new Set();
  for (const level of Object.keys(L.CURRICULUM)) for (const sub of L.CURRICULUM[level]) {
    const b = L.landmarkIdFor(sub.id, sub.paperNumber); const i = L.isleKindFor(sub.id, sub.paperNumber);
    assert.ok(L.LANDMARK_ORDER.includes(b), sub.id); assert.ok(L.ISLE_KINDS.includes(i), sub.id);
    assert.equal(sameKind[b], i, `${sub.id}: the school and the sea should match`);
    buildings.add(b); islands.add(i);
  }
  assert.equal(buildings.size, 10); assert.equal(islands.size, 10);
  assert.equal(L.LANDMARK_ORDER.length, 10); assert.equal(L.ISLE_KINDS.length, 10);
});
t('a custom paper still gets a building and an island by its paper number, and odd numbers do not break it', () => {
  for (const n of [1, 2, 10, 11, 25, 0, -3, NaN, 2.7]) {
    assert.ok(L.LANDMARK_ORDER.includes(L.landmarkIdFor('custom-x', n)), String(n));
    assert.ok(L.ISLE_KINDS.includes(L.isleKindFor('custom-x', n)), String(n));
  }
  assert.equal(L.landmarkIdFor('custom-x', 1), L.LANDMARK_ORDER[0]); assert.equal(L.landmarkIdFor('custom-x', 11), L.LANDMARK_ORDER[0]);
  assert.equal(L.isleKindFor('custom-x', 3), L.ISLE_KINDS[2]);
});
t('windows: lit once anything is done, never all lit before the paper is finished, never going down', () => {
  for (const total of [1, 3, 8, 14, 30]) for (const slots of [6, 8, 10]) {
    let prev = 0;
    for (let lit = 0; lit <= total; lit++) {
      const w = L.windowsLit(lit, total, slots);
      assert.ok(w >= prev, `${lit}/${total} never goes down`); prev = w;
      if (lit > 0) assert.ok(w >= 1, `${lit}/${total} lights something`);
      if (lit < total) assert.ok(w <= slots - 1, `${lit}/${total} is not finished`);
    }
    assert.equal(L.windowsLit(total, total, slots), slots); assert.equal(L.windowsLit(0, total, slots), 0);
  }
  assert.equal(L.windowsLit(5, 0, 8), 0); assert.equal(L.windowsLit(5, 10, 0), 0);
  assert.equal(L.windowsLit(99, 10, 8), 8); assert.equal(L.windowsLit(-4, 10, 8), 0);
});
t('each building lights its windows in a fixed shuffle, and a lit window never goes out as more light up', () => {
  for (const seed of [1, 2, 7, 12345]) for (const slots of [6, 8, 10]) {
    const o = L.slotOrder(seed, slots);
    assert.deepEqual([...o].sort((a, b) => a - b), Array.from({ length: slots }, (_, i) => i));
    assert.deepEqual(L.slotOrder(seed, slots), o);
    let prev = L.litFlags(seed, 0, slots);
    assert.equal(prev.filter(Boolean).length, 0);
    for (let k = 1; k <= slots; k++) {
      const cur = L.litFlags(seed, k, slots);
      assert.equal(cur.filter(Boolean).length, k);
      prev.forEach((on, i) => { if (on) assert.ok(cur[i], 'a lit window stays lit'); });
      prev = cur;
    }
  }
  assert.notDeepEqual(L.slotOrder(1, 8), L.slotOrder(2, 8), 'different buildings light in a different order');
});
t('the school fits the map for one paper up to fourteen: two rows, nothing overlaps, nothing leaves the stage', () => {
  const half = 344 / 2;
  for (let count = 1; count <= 14; count++) {
    const spots = L.groundsLayout(count);
    assert.equal(spots.length, count);
    const scale = spots[0].scale;
    assert.ok(scale >= 0.3 && scale <= 0.66, `scale ${scale} for ${count}`);
    spots.forEach((sp, i) => {
      assert.equal(sp.scale, scale);
      assert.ok(sp.x - half * scale >= 0 && sp.x + half * scale <= L.GROUNDS.w, `building ${i} of ${count} stays on the stage`);
      assert.equal(sp.y, i % 2 ? L.GROUNDS.rowB : L.GROUNDS.rowA);
    });
    for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
      if (spots[a].y !== spots[b].y) continue;
      assert.ok(Math.abs(spots[a].x - spots[b].x) >= 344 * scale - 0.01, `${a} and ${b} of ${count} would overlap`);
    }
  }
  assert.deepEqual(L.groundsLayout(0), []);
});
t('ivy and dust: none on a visited paper, thicker the longer it is left, never more than full', () => {
  assert.equal(L.neglectAmount(null, true), 0); assert.equal(L.neglectAmount(30, false), 0);
  const a = L.neglectAmount(L.NEGLECT_DAYS, true), b = L.neglectAmount(L.NEGLECT_DAYS + 10, true), c = L.neglectAmount(400, true);
  assert.ok(a >= 0.18 && a < b && b < c && c === 1, `${a} ${b} ${c}`);
});
t('one lantern stands on the shore for each chapter: as many spots as lanterns, left to right, all on the island', () => {
  assert.deepEqual(L.lanternSpots(0), []);
  for (const total of [1, 2, 5, 12, 28]) {
    const sp = L.lanternSpots(total); assert.equal(sp.length, total);
    sp.forEach((p) => assert.ok(Math.abs(p.x) <= 90 && p.y >= 10 && p.y <= 41, `${total}: ${p.x},${p.y}`));
    for (let i = 1; i < total; i++) assert.ok(sp[i].x > sp[i - 1].x, 'left to right');
  }
});

console.log('Lanternfell: stored data and words');
t('stored school data that is old, edited or damaged turns into something safe', () => {
  const e = L.normaliseAcademy(null);
  assert.equal(e.house, null); assert.deepEqual(e.answers, [null, null, null]); assert.equal(e.finaleSeen, false); assert.deepEqual(e.cleared, {});
  assert.deepEqual(L.normaliseAcademy('junk'), e); assert.deepEqual(L.normaliseAcademy(42), e);
  const ok = L.normaliseAcademy({ v: 1, house: 'fox', chosenOn: '2026-09-01', answers: [2, 0, 3], virtues: { grit: 40, care: 150, wit: -9, steadiness: 'x' }, cleared: { inter: '2026-10-01', final: 'soon' }, finaleSeen: true });
  assert.equal(ok.house, 'fox'); assert.equal(ok.chosenOn, '2026-09-01'); assert.deepEqual(ok.answers, [2, 0, 3]);
  assert.deepEqual(ok.virtues, { grit: 40, care: 100, wit: 0, steadiness: 0 });
  assert.deepEqual(ok.cleared, { inter: '2026-10-01' }); assert.equal(ok.finaleSeen, true);
  const bad = L.normaliseAcademy({ house: 'dragon', chosenOn: '2026-09-01', virtues: { grit: 1, care: 1, wit: 1, steadiness: 1 }, answers: [7, 1.5, '2'] });
  assert.equal(bad.house, null); assert.equal(bad.chosenOn, null); assert.equal(bad.virtues, null); assert.deepEqual(bad.answers, [null, null, null]);
  assert.deepEqual(L.normaliseAcademy(ok), ok, 'normalising twice changes nothing');
});
t('Lanternfell has eight ranks like the app; plain words and the other worlds keep their own', () => {
  assert.equal(L.ACADEMY_RANKS.length, 8); assert.equal(L.ACADEMY_RANKS.length, L.VOYAGE_RANKS.length);
  assert.equal(new Set(L.ACADEMY_RANKS).size, 8);
  assert.equal(L.wordsFor('academy', false).rank('Fresh Aspirant'), 'Wick');
  assert.equal(L.wordsFor('academy', true).rank('Fresh Aspirant'), 'Fresh Aspirant');
  assert.equal(L.wordsFor('voyage', false).rank('Fresh Aspirant'), 'Deckhand');
  const home = { id: 'home', label: 'Home', short: 'Home' };
  assert.equal(L.wordsFor('academy', false).section(home).label, 'The Atrium');
  assert.equal(L.wordsFor('academy', true).section(home).label, 'Home');
  assert.equal(L.wordsFor('default', false).section(home).label, 'Home');
  assert.equal(L.normaliseWorld('academy'), 'academy'); assert.equal(L.normaliseWorld('somewhere-else'), 'default');
});
t('nothing borrowed from the famous school stories appears anywhere in src/ or public/', () => {
  const walk = (d) => fsm.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  // Whole words only: "diagon" is inside the ordinary word "diagonal", which both the SVG kit and the Excel writer use.
  const banned = ['hogwarts', 'gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff', 'quidditch', 'muggles?', 'horcruxes?', 'patronus', 'sorting hat', 'diagon', 'dumbledore', 'snape', 'hermione', 'voldemort', 'hogsmeade', 'azkaban', 'gringotts', 'weasleys?', 'malfoy', 'hagrid', 'harry potter', 'butterbeer', 'expelliarmus', 'wingardium', 'platform 9 ?(3/4|¾)', 'knockturn'];
  const rx = banned.map((w) => [w, new RegExp(`(^|[^a-z])${w}($|[^a-z])`)]);
  const hits = [];
  for (const dirName of ['src', 'public']) for (const f of walk(path.join(root, dirName))) {
    if (!/\.(tsx?|css|json|svg|md|html|webmanifest)$/.test(f)) continue;
    const txt = fsm.readFileSync(f, 'utf8').toLowerCase();
    for (const [w, re] of rx) if (re.test(txt)) hits.push(`${path.relative(root, f)}: ${w}`);
  }
  // The check itself has to be able to fail: a made-up file containing a borrowed name must be caught, and "diagonal" must not.
  assert.ok(rx.some(([, re]) => re.test('welcome to hogwarts!')), 'the check catches a borrowed name');
  assert.ok(!rx.some(([, re]) => re.test('a diagonal stroke and a diagonal border')), 'the check ignores ordinary words');
  assert.deepEqual(hits, []);
});

console.log(`\n${n} checks passed${process.exitCode ? ', some failed' : ''}`);
// The sound engine keeps a message channel open (a browser scheduling trick), which would keep node running after the last check.
process.exit(process.exitCode ?? 0);

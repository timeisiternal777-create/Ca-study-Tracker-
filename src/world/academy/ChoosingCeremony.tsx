import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { LuArrowLeft, LuCheck, LuRotateCcw, LuX } from 'react-icons/lu';
import './ceremony.css';
import { useStudy } from '../../context/StudyContext';
import { useFocusTrap, useLockScroll } from '../../hooks/useDialog';
import { celebrate } from '../../lib/celebrate';
import { burst } from '../../lib/fx';
import { sfx } from '../../lib/sfx';
import { Cast } from './art/cast/Cast';
import { HouseCrest } from './art/crests';
import { ChoosingLantern } from './art/props';
import { Fireflies } from './art/scene';
import { QUESTIONS, QUESTION_COUNT, MEASURED_WEIGHT, MIN_DAYS_OF_DATA, VIRTUES, chooseHouse, virtueLabel, type Answers, type Measured } from './choosing';
import { HOUSES, HOUSE_ORDER, type HouseId } from './houses';
import { useAcademy } from './academyState';

type Step = 'intro' | 'think' | 'reveal' | number;

const motionNow = () => (typeof document === 'undefined' ? 'full' : document.documentElement.getAttribute('data-motion') ?? 'full');
const HOUSE_OF_VIRTUE = (v: (typeof VIRTUES)[number]) => HOUSE_ORDER.find((h) => HOUSES[h].virtue === v)!;

/**
 * The Choosing: Headmistress Vane explains, three questions, the lantern reads the last four weeks, and it names a house.
 * The house comes from the blend in choosing.ts (60 percent what the student really did, 40 percent the answers). Nothing is saved until the
 * student takes the house, so closing the ceremony at any point changes nothing.
 */
export function Choosing({ measured, onClose }: { measured: Measured; onClose: () => void }) {
  const { today } = useStudy();
  const { state, choose } = useAcademy();
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<Answers>(() => Array.from({ length: QUESTION_COUNT }, () => null));
  const [picked, setPicked] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const crest = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useLockScroll(true);
  useFocusTrap(root, true, onClose);

  const choice = useMemo(() => chooseHouse(measured.virtues, answers, measured.daysOfData), [measured, answers]);
  const anyAnswer = answers.some((a) => a !== null);
  const enoughData = measured.daysOfData >= MIN_DAYS_OF_DATA;
  const nothingToRead = !anyAnswer && !enoughData;
  const again = state.house !== null;

  // Each step replaces the last one's buttons, so focus moves to the new step's first control (keyboard and screen-reader users stay inside).
  useEffect(() => { const el = root.current?.querySelector<HTMLElement>('[data-autofocus]'); (el ?? root.current)?.focus({ preventScroll: true }); }, [step, nothingToRead]);

  // The lantern reads for a moment, then the house appears. With motion set to "still" there is no wait.
  useEffect(() => {
    if (step !== 'think') return;
    sfx.play('step');
    const m = motionNow();
    const t = window.setTimeout(() => setStep('reveal'), m === 'still' ? 0 : m === 'calm' ? 700 : 1700);
    return () => window.clearTimeout(t);
  }, [step]);

  // The reveal: a chime, and a small burst of light in the house colours over the crest.
  useEffect(() => {
    if (step !== 'reveal' || nothingToRead) return;
    sfx.play('badge');
    if (motionNow() === 'still') return;
    const t = window.setTimeout(() => {
      const r = crest.current?.getBoundingClientRect(); const c = HOUSES[choice.house].colors;
      if (r) burst(r.left + r.width / 2, r.top + r.height / 2, { count: 14, power: 1.5, colors: [c.metal, c.light, c.main] });
    }, 260);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const answer = (q: number, a: number | null) => {
    setPicked(a);
    sfx.play(a === null ? 'tap' : 'select');
    window.setTimeout(() => {
      setAnswers((cur) => cur.map((v, i) => (i === q ? a : v)));
      setPicked(null);
      setStep(q + 1 >= QUESTION_COUNT ? 'think' : q + 1);
    }, a === null ? 0 : motionNow() === 'still' ? 0 : 240);
  };

  // 1 to 4 pick the answer in front of you.
  useEffect(() => {
    if (typeof step !== 'number') return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && !e.metaKey && !e.ctrlKey && !e.altKey && picked === null) { e.preventDefault(); answer(step, n - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, picked]);

  const accept = () => {
    choose(choice.house, measured.virtues, answers, today);
    sfx.play('rank');
    celebrate({ kind: 'rank', title: `${HOUSES[choice.house].name} is your house`, sub: HOUSES[choice.house].motto, mood: 'cheer' });
    onClose();
  };
  const restart = () => { setPicked(null); setStep(0); };
  const back = () => { setPicked(null); setStep((s) => (typeof s === 'number' ? (s === 0 ? 'intro' : s - 1) : s)); };

  const revealed = step === 'reveal' && !nothingToRead;
  const h: HouseId | null = revealed ? choice.house : null;
  const hc = h ? HOUSES[h].colors : null;
  const phase = typeof step === 'number' ? 'ask' : step;
  const dot = step === 'intro' ? 0 : typeof step === 'number' ? step + 1 : QUESTION_COUNT + 1;

  return createPortal(
    <div ref={root} className={`cho is-${phase}${revealed ? ' is-house' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
      style={hc ? ({ ['--hc' as string]: hc.main, ['--hm' as string]: hc.metal, ['--hl' as string]: hc.light, ['--hd' as string]: hc.deep } as CSSProperties) : undefined}>
      <div className="cho-sky" aria-hidden><Fireflies n={16} seed={21} /></div>
      <div className="cho-card">
        <button type="button" className="cho-x" onClick={onClose} aria-label="Close the Choosing"><LuX /></button>

        <div className="cho-lantern" aria-hidden>
          <span className="cho-ring" /><span className="cho-ring cho-ring--2" />
          <ChoosingLantern size={256} house={h ?? undefined} lit={phase === 'think' || revealed} idPrefix="chl" />
        </div>

        <div className="cho-main" aria-live="polite">
          {step === 'intro' ? (
            <div className="cho-pane">
              <div className="cho-speaker"><Cast who="vane" expr="smile" size={92} title="Headmistress Vane" /><div><b>Headmistress Vane</b><small>Keeper of the old lantern</small></div></div>
              <h2 id={titleId} className="cho-title">{again ? 'The lantern will look again' : 'Every student is chosen'}</h2>
              <p className="cho-text">{again
                ? 'A term has passed. The old lantern reads your last four weeks of study once more, and asks its three questions. You may keep your house, or be given another.'
                : 'Not by luck. The old lantern reads how you have really studied, and asks you three questions. Then it names one of four houses: Ashwold, Mirewing, Emberquill or Hollowhearth.'}</p>
              <p className={`cho-data${enoughData ? ' is-ok' : ''}`}>{enoughData
                ? `It has ${measured.daysOfData} days of your study to read. About ${Math.round(MEASURED_WEIGHT * 100)}% of the choice is what you did; the rest is your answers.`
                : measured.daysOfData > 0
                  ? `Only ${measured.daysOfData} ${measured.daysOfData === 1 ? 'day' : 'days'} of study so far, which is too little to read. Your answers will decide.`
                  : 'No study logged yet, so there is nothing for the lantern to read. Your answers will decide.'}</p>
              <div className="cho-acts">
                <button type="button" className="cho-btn cho-btn--main" onClick={() => { sfx.play('primary'); setStep(0); }} data-autofocus>Begin</button>
                <button type="button" className="cho-btn" onClick={onClose}>Not now</button>
              </div>
            </div>
          ) : typeof step === 'number' ? (
            <div className="cho-pane" key={step}>
              <p className="cho-kicker">Question {step + 1} of {QUESTION_COUNT}</p>
              <h2 id={titleId} className="cho-q">{QUESTIONS[step].prompt}</h2>
              <div className="cho-answers" role="radiogroup" aria-label={QUESTIONS[step].prompt}>
                {QUESTIONS[step].answers.map((a, i) => (
                  <button key={i} type="button" role="radio" aria-checked={picked === i || (picked === null && answers[step] === i)} className={`cho-ans${picked === i || (picked === null && answers[step] === i) ? ' is-on' : ''}`} onClick={() => answer(step, i)} data-autofocus={i === 0 ? true : undefined}>
                    <span className="cho-key" aria-hidden>{picked === i ? <LuCheck /> : i + 1}</span><span>{a.text}</span>
                  </button>
                ))}
              </div>
              <div className="cho-acts cho-acts--split">
                <button type="button" className="cho-btn cho-btn--quiet" onClick={back}><LuArrowLeft />Back</button>
                <button type="button" className="cho-btn cho-btn--quiet" onClick={() => answer(step, null)}>Skip this one</button>
              </div>
            </div>
          ) : step === 'think' ? (
            <div className="cho-pane cho-pane--think" role="status">
              <h2 id={titleId} className="cho-title">The lantern is reading</h2>
              <p className="cho-text">{enoughData ? 'Your last four weeks of study, and your three answers.' : 'Your three answers.'}</p>
              <span className="cho-dots" aria-hidden><i /><i /><i /></span>
            </div>
          ) : nothingToRead ? (
            <div className="cho-pane">
              <h2 id={titleId} className="cho-title">There is nothing to read yet</h2>
              <p className="cho-text">You skipped every question and there is almost no study logged, so the lantern has no way to choose. Answer at least one question, or come back after a few days of study.</p>
              <div className="cho-acts">
                <button type="button" className="cho-btn cho-btn--main" onClick={restart} data-autofocus><LuRotateCcw />Answer the questions</button>
                <button type="button" className="cho-btn" onClick={onClose}>Not now</button>
              </div>
            </div>
          ) : (
            <div className="cho-pane cho-pane--house">
              <div className="cho-reveal">
                <div ref={crest} className="cho-crest"><span className="cho-flash" /><HouseCrest house={choice.house} size={132} title={`${HOUSES[choice.house].name} crest`} idPrefix="chr" /></div>
                <div className="min-0">
                  <p className="cho-kicker">{again && state.house === choice.house ? 'The lantern keeps you in' : 'The lantern names'}</p>
                  <h2 id={titleId} className="cho-house">{HOUSES[choice.house].name}</h2>
                  <p className="cho-motto">“{HOUSES[choice.house].motto}”</p>
                </div>
              </div>
              <p className="cho-text">{HOUSES[choice.house].blurb}</p>
              <ul className="cho-bars" aria-label="How the four virtues scored">
                {[...VIRTUES].sort((a, b) => choice.blended[b] - choice.blended[a]).map((v) => {
                  const own = HOUSES[HOUSE_OF_VIRTUE(v)];
                  return (
                    <li key={v} className={own.id === choice.house ? 'is-top' : undefined}>
                      <span>{virtueLabel(v)}</span>
                      <i style={{ ['--w' as string]: `${Math.max(2, choice.blended[v])}%`, ['--c' as string]: own.colors.main }} />
                      <b className="t-num">{Math.round(choice.blended[v])}</b>
                    </li>
                  );
                })}
              </ul>
              <p className="cho-fine">
                {!enoughData ? 'Chosen by your answers alone, because there are fewer than three days of study to read.'
                  : !anyAnswer ? 'Chosen by your study alone, because you skipped every question.'
                    : `Weighed ${Math.round(MEASURED_WEIGHT * 100)}% on your last four weeks and ${Math.round((1 - MEASURED_WEIGHT) * 100)}% on your answers.`}
                {choice.close ? ' It was a very close call between two houses.' : ''}
              </p>
              <div className="cho-acts">
                <button type="button" className="cho-btn cho-btn--main cho-btn--house" onClick={accept} data-autofocus>{again && state.house === choice.house ? `Stay in ${HOUSES[choice.house].name}` : `Join ${HOUSES[choice.house].name}`}</button>
                <button type="button" className="cho-btn" onClick={restart}><LuRotateCcw />Answer again</button>
                <button type="button" className="cho-btn cho-btn--quiet" onClick={onClose}>Not now</button>
              </div>
            </div>
          )}
        </div>

        <ol className="cho-steps" aria-hidden>{Array.from({ length: QUESTION_COUNT + 2 }, (_, i) => <li key={i} className={i === dot ? 'is-now' : i < dot ? 'is-past' : undefined} />)}</ol>
      </div>
    </div>,
    document.body,
  );
}

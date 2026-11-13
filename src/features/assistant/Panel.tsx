import { useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowRight, LuBookOpen, LuChevronDown, LuCompass, LuSearch, LuSparkles, LuX } from 'react-icons/lu';
import { Blip, type BlipMood } from '../../components/blip/Blip';
import { HELP, restingMood, searchHelp, type AssistantFacts, type HelpEntry, type Suggestion } from '../../lib/assistant';
import { navigateTo } from '../../lib/nav';
import type { TabType } from '../../types';

const POPULAR = ['log', 'xp', 'freeze', 'plan', 'backup', 'readiness'].map((id) => HELP.find((h) => h.id === id)!).filter(Boolean);

export function Panel({ name, facts, list, side, closing, focusHelp, onClose, onTour, onGuide }: {
  name: string; facts: AssistantFacts; list: Suggestion[]; side: 'left' | 'right'; closing: boolean; focusHelp: boolean;
  onClose: () => void; onTour: () => void; onGuide: () => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const top = list[0];
  const results = useMemo(() => searchHelp(q), [q]);
  const asked = q.trim().length > 0;
  const mood: BlipMood = asked ? (results.length ? 'happy' : 'think') : restingMood(facts, top);

  useEffect(() => { if (focusHelp) inputRef.current?.focus(); }, [focusHelp]);
  useEffect(() => { setOpen(results[0]?.id ?? null); }, [results]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const go = (tab: TabType) => { navigateTo(tab); onClose(); };
  const hello = name ? `Hi ${name}!` : 'Hi!';

  return (
    <>
      <div className="bl-catch" onPointerDown={onClose} aria-hidden />
      <section className={`bl-panel is-${side}${closing ? ' is-closing' : ''}`} role="dialog" aria-label="Blip, your study helper">
        <header className="bl-head">
          <Blip mood={mood} size={64} />
          <div className="min-0 grow">
            <div className="bl-hello">{asked ? (results.length ? 'Here’s what I found' : 'Hmm, I’m not sure') : hello}</div>
            <div className="bl-sub">{asked ? (results.length ? 'Tap an answer to read it.' : 'Try one or two simple words, like “backup” or “streak”.') : 'What can I help with?'}</div>
          </div>
          <button type="button" className="bl-x" data-sfx="none" onClick={onClose} aria-label="Close"><LuX aria-hidden /></button>
        </header>

        <div className="bl-body">
          {!asked && top ? (
            <div className="bl-now">
              <div className="bl-label"><LuSparkles aria-hidden />What should I do now?</div>
              <div className="bl-top">
                <b>{top.title}</b>
                <p>{top.body}</p>
                {top.action ? <button type="button" className="bl-go" onClick={() => go(top.action!.tab)}>{top.action.label}<LuArrowRight aria-hidden /></button> : null}
              </div>
              {list.length > 1 ? (
                <ul className="bl-more" aria-label="Other ideas">
                  {list.slice(1, 4).map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => (s.action ? go(s.action.tab) : undefined)} disabled={!s.action}>
                        <span className="grow min-0"><b>{s.title}</b></span>{s.action ? <LuArrowRight aria-hidden /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="bl-ask">
            <div className="bl-label"><LuSearch aria-hidden />Ask me</div>
            <label className="bl-search">
              <LuSearch aria-hidden />
              <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example, backup or streak" aria-label="Ask a question" enterKeyHint="search" autoComplete="off" />
              {q ? <button type="button" onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Clear"><LuX aria-hidden /></button> : null}
            </label>
            {!asked ? (
              <div className="bl-chips">{POPULAR.map((h) => <button key={h.id} type="button" onClick={() => { setQ(h.q.replace('?', '')); }}>{h.q}</button>)}</div>
            ) : (
              <ul className="bl-results">
                {results.map((h: HelpEntry) => {
                  const on = open === h.id;
                  return (
                    <li key={h.id} className={on ? 'is-open' : ''}>
                      <button type="button" className="bl-q" aria-expanded={on} onClick={() => setOpen(on ? null : h.id)}><span>{h.q}</span><LuChevronDown aria-hidden /></button>
                      {on ? (
                        <div className="bl-a">
                          <p>{h.a}</p>
                          {h.id === 'tour' ? <button type="button" className="bl-go" onClick={onTour}>Start the tour<LuArrowRight aria-hidden /></button>
                            : h.go ? <button type="button" className="bl-go" onClick={() => go(h.go!.tab)}>{h.go.label}<LuArrowRight aria-hidden /></button> : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <footer className="bl-foot">
          <button type="button" onClick={onTour}><LuCompass aria-hidden />Take the tour</button>
          <button type="button" onClick={onGuide}><LuBookOpen aria-hidden />Full guide</button>
        </footer>
      </section>
    </>
  );
}

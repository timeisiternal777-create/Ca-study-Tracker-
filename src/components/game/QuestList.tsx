import { LuCalendarCheck, LuCheck, LuClipboardCheck, LuCrosshair, LuGift, LuGlobe, LuLayers, LuTarget } from 'react-icons/lu';
import type { ReactNode } from 'react';
import './game.css';
import { useStudy } from '../../context/StudyContext';
import { celebrate } from '../../lib/celebrate';
import { cn, fmtNum } from '../../lib/format';
import type { Quest } from '../../lib/quests';
import { sfx } from '../../lib/sfx';

const ICON: Record<string, ReactNode> = {
  goal: <LuTarget />, variety: <LuLayers />, weak: <LuCrosshair />, days: <LuCalendarCheck />, mock: <LuClipboardCheck />, cover: <LuGlobe />,
};
const ACC: Record<string, string> = { goal: 'acc-mint', variety: 'acc-cyan', weak: 'acc-ember', days: 'acc-gold', mock: 'acc-rose', cover: 'acc-violet' };

export function QuestRow({ q, onClaim }: { q: Quest; onClaim: (q: Quest) => void }) {
  const pct = q.target > 0 ? Math.min(1, q.value / q.target) : 0;
  return (
    <li className={cn('qs-row', ACC[q.id] || 'acc-brand', q.done && 'is-done', q.claimed && 'is-claimed')}>
      <span className="qs-ic" aria-hidden>{q.claimed ? <LuCheck /> : ICON[q.id] || <LuTarget />}</span>
      <div className="qs-main min-0">
        <div className="qs-title truncate">{q.title}</div>
        <div className="qs-bar" role="progressbar" aria-valuemin={0} aria-valuemax={q.target} aria-valuenow={q.value} aria-label={q.title}><i style={{ transform: `scaleX(${pct})` }} /></div>
        <div className="qs-hint t-xs dim">{q.done ? (q.claimed ? 'Collected' : 'Done. Collect your XP.') : `${fmtNum(q.value, q.unit === 'h' ? 1 : 0)} of ${fmtNum(q.target, q.unit === 'h' ? 1 : 0)} ${q.unit} · ${q.hint}`}</div>
      </div>
      {q.claimed ? <span className="qs-xp is-got">+{q.xp}</span>
        : q.done ? <button type="button" className="qs-collect" onClick={() => onClaim(q)}><LuGift aria-hidden />Collect +{q.xp}</button>
        : <span className="qs-xp">+{q.xp} XP</span>}
    </li>
  );
}

/** Collecting a quest adds its XP once. Everything else about quests comes from the study log. */
export function useClaim() {
  const { claimQuest } = useStudy();
  return (q: Quest) => {
    const xp = claimQuest(q.key);
    if (!xp) return;
    sfx.play('quest');
    celebrate({ kind: 'quest', title: 'Quest complete', sub: q.title, xp, mood: 'cheer' });
  };
}

export function QuestList({ kind, quests }: { kind: 'daily' | 'weekly'; quests: Quest[] }) {
  const claim = useClaim();
  const list = quests.filter((q) => q.kind === kind);
  if (!list.length) return null;
  return <ul className="qs-list">{list.map((q) => <QuestRow key={q.key} q={q} onClaim={claim} />)}</ul>;
}

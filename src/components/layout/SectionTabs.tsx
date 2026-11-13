import { useEffect } from 'react';
import { SECTION_BY_TAB, NAV_BY_ID } from '../../config/nav';
import { navigateTo } from '../../lib/nav';
import type { TabType } from '../../types';
import { useSlider } from './useSlider';
import { useWorld } from '../../world';

/** Tabs for screens that belong together (for example Mocks: Log a mock, Analysis, Target marks). */
export function SectionTabs({ tab }: { tab: TabType }) {
  const section = SECTION_BY_TAB[tab];
  const { words } = useWorld();
  const { ref, box, ready } = useSlider<HTMLDivElement>([tab, words]);
  useEffect(() => {
    const el = ref.current; const b = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !b || el.scrollWidth <= el.clientWidth + 2) return;
    el.scrollTo({ left: b.offsetLeft - (el.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
  }, [tab, ref]);
  if (!section || section.tabs.length < 2) return null;
  return (
    <div className="sect-tabs" role="tablist" aria-label={words.section(section).label} ref={ref} data-tour="section-tabs">
      {box ? <i className={`sect-glide${ready ? ' is-ready' : ''}`} style={{ width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }} aria-hidden /> : null}
      {section.tabs.map((id) => {
        const it = NAV_BY_ID[id]; const Icon = it.icon;
        return (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="sect-tab" onClick={() => { if (id !== tab) { navigateTo(id); } }}>
            <Icon aria-hidden /><span>{words.tab(id, it.label)}</span>
          </button>
        );
      })}
    </div>
  );
}

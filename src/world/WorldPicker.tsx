import { lazy, Suspense, useEffect, useState } from 'react';
import { LuCheck, LuPlay } from 'react-icons/lu';
import { Button, Switch } from '../components/ui';
import { Logo } from '../components/layout/Logo';
import { useStudy } from '../context/StudyContext';
import { sfx } from '../lib/sfx';
import { Row } from '../features/settings/data';
import { VoyageMark } from './VoyageMark';
import { Crew } from './crew/Crew';
import { useVoyage } from './voyage/voyageState';
import { useSwitchWorld } from './useSwitchWorld';
import { normaliseWorld, type World } from './words';

const Finale = lazy(() => import('./voyage/Finale').then((m) => ({ default: m.Finale })));
const AcademyPickerArt = lazy(() => import('./academy/PickerArt'));
const VoyagePickerArt = lazy(() => import('./voyage/PickerArt'));

/** The choice between the everyday look and the two optional worlds, with a small preview of each. */
export function WorldPicker() {
  const { settings, updateSettings, stats } = useStudy();
  const { state: vs } = useVoyage();
  const [ending, setEnding] = useState(false);
  const world = normaliseWorld(settings.worldTheme);

  // A world brings its own sounds. Fetch them while this screen is open, so the first note of the welcome is already in the new kit.
  useEffect(() => { void sfx.load('voyage'); void sfx.load('lantern'); }, []);

  const pick = useSwitchWorld();

  const voyage = world === 'voyage', academy = world === 'academy';
  return (
    <>
      <Row stack title="World" desc="An optional look for the whole app. Voyage turns your course into a journey: Foundation, Intermediate and Final are three seas, each paper is an island and every chapter you tick lights a lantern. Lanternfell turns it into a school on a hill: each paper is a building, every chapter you tick lights a window, and four houses, measured from how you really study, compete for the cup. Each brings its own sounds. Your data never changes, and you can switch back whenever you like.">
        <div className="wp" role="radiogroup" aria-label="World">
          <button type="button" role="radio" aria-checked={world === 'default'} className="wp-card wp-card--default" onClick={() => pick('default')}>
            <span className="wp-art wp-art--logo" aria-hidden><Logo size={96} /></span>
            <span className="wp-name">Everyday{world === 'default' ? <LuCheck aria-hidden /> : null}</span>
            <span className="wp-sub">The look you know, in the accent colour you chose.</span>
          </button>
          <button type="button" role="radio" aria-checked={voyage} className="wp-card wp-card--voyage" onClick={() => pick('voyage')}>
            <Suspense fallback={<span className="wp-art" aria-hidden />}><VoyagePickerArt /></Suspense>
            <span className="wp-name">The Ledger Seas{voyage ? <LuCheck aria-hidden /> : null}</span>
            <span className="wp-sub">Night at sea: lantern gold, sea-foam and a crew who read your real numbers.</span>
          </button>
          <button type="button" role="radio" aria-checked={academy} className="wp-card wp-card--academy" onClick={() => pick('academy')}>
            <Suspense fallback={<span className="wp-art wp-art--scene" aria-hidden />}><AcademyPickerArt /></Suspense>
            <span className="wp-name">Lanternfell Academy{academy ? <LuCheck aria-hidden /> : null}</span>
            <span className="wp-sub">A school on a hill at night: a building for every paper, four houses, and teachers who read your real numbers.</span>
          </button>
        </div>
      </Row>
      {voyage || academy ? (
        <Row title="Plain words" desc={voyage ? 'Keep the Voyage look but use ordinary names: Overview, Log, Mocks, Plan. Handy if the sea words slow you down.' : 'Keep the Lanternfell look but use ordinary names: Overview, Log, Mocks, Plan. Handy if the school words slow you down.'}>
          <Switch checked={!!settings.plainWords} label="Plain words" onChange={(v) => updateSettings({ plainWords: v })} />
        </Row>
      ) : null}
      {voyage ? (
        <Row stack title="Your crew and the ending" desc="Sol, the captain, is you: change how Sol looks and name the ship on the Sea chart. The ending plays when you mark CA Final cleared. You can watch it now to see where the journey leads.">
          <div className="row g-4 wrap">
            <span className="wp-crew" aria-hidden><VoyageMark size={34} /><Crew who="sol" expr="smile" size={64} captain={vs.captain} /><Crew who="odalys" expr="proud" size={64} /><Crew who="tally" expr="cheer" size={64} /></span>
            <Button size="sm" variant="soft" onClick={() => setEnding(true)}><LuPlay aria-hidden />Watch the ending</Button>
          </div>
        </Row>
      ) : null}
      {ending ? <Suspense fallback={null}><Finale shipName={vs.shipName} captain={vs.captain} name={settings.displayName.trim().split(/\s+/)[0] || 'Captain'} totalHours={stats.totalStudiedHours} onClose={() => setEnding(false)} /></Suspense> : null}
    </>
  );
}

import { LuArrowRight, LuSparkles } from 'react-icons/lu';
import './academy-card.css';
import { Button, Card } from '../../components/ui';
import { clamp } from '../../lib/format';
import { navigateTo } from '../../lib/nav';
import { Cast } from './art/cast/Cast';
import { HouseCrest } from './art/crests';
import { PostLantern } from './art/props';
import { CastleScene } from './art/scene';
import { virtueLabel } from './choosing';
import { YEAR_NAME } from './grounds';
import { HOUSES } from './houses';
import { useAcademySummary } from './useAcademySummary';

/**
 * The Atrium's window onto the school: the castle on its hill with the post lantern bobbing by it, how far through the school you are,
 * the Headmistress's line for the day (the same one the Grounds shows, worked out from your real numbers) and your house.
 */
export function AcademyCard() {
  const { level, levelLabel, state, cup, lines, fraction, won } = useAcademySummary();
  const pct = Math.round(clamp(fraction, 0, 1) * 100);
  const house = state.house ? HOUSES[state.house] : null;
  const vane = lines.vane;
  const holdsCup = !!house && cup.winner === house.id;

  return (
    <Card className="axcard" size="flush">
      <div className="ax-scene" aria-hidden>
        <CastleScene id="axs" flags={false} />
        <div className="ax-post"><PostLantern size={96} idPrefix="axp" /></div>
      </div>
      <div className="ax-copy">
        <p className="ax-kicker">{levelLabel} · {YEAR_NAME[level]}</p>
        <h2 className="ax-title">{won ? 'The Charter is yours' : `${pct}% of the school is behind you`}</h2>
        <div className="ax-say">
          <Cast who="vane" expr={vane.expr} size={58} title="Headmistress Vane" />
          <p>{vane.text}</p>
        </div>
        <div className="ax-act">
          {house ? (
            <>
              <Button variant="primary" onClick={() => navigateTo('GROUNDS')}>Open the Grounds<LuArrowRight aria-hidden /></Button>
              <span className="ax-house" title={`${house.name}: ${house.motto}`}>
                <HouseCrest house={house.id} size={30} idPrefix="axh" />
                <span><b>{house.name}</b><small>{holdsCup && cup.virtue ? `Holds the cup for ${virtueLabel(cup.virtue).toLowerCase()}` : cup.winner ? `${HOUSES[cup.winner].name} holds the cup` : 'No cup this week yet'}</small></span>
              </span>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={() => navigateTo('GROUNDS')}><LuSparkles aria-hidden />Be chosen for a house</Button>
              <Button variant="soft" onClick={() => navigateTo('GROUNDS')}>Open the Grounds<LuArrowRight aria-hidden /></Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { LuVolume2 } from 'react-icons/lu';
import { Range, Segmented, Switch } from '../../components/ui';
import { useStudy } from '../../context/StudyContext';
import { KITS, SOUNDS, SOUND_GROUPS, SOUND_NAMES, sfx, type KitId, type SfxLevel, type SfxName } from '../../lib/sfx';
import { Row } from './data';

/** Everything about sound in one place: on/off, kit, volume, which taps make sound, vibration, and a lab to listen. */
export function SoundSettings() {
  const { settings, updateSettings } = useStudy();
  const on = settings.hudChimes !== false;
  const kit: KitId = settings.sfxKit ?? 'soft';
  const level: SfxLevel = settings.sfxLevel ?? 'full';
  const volume = settings.sfxVolume ?? 80;
  const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  // The lab plays whatever kit is picked; wait for it to load before the first preview.
  const [ready, setReady] = useState(false);
  const [last, setLast] = useState<SfxName | null>(null);
  useEffect(() => { let live = true; setReady(false); void sfx.load(kit).then(() => { if (live) setReady(true); }); return () => { live = false; }; }, [kit]);

  const audition = (name: SfxName) => { setLast(name); sfx.preview(name); window.setTimeout(() => setLast((n) => (n === name ? null : n)), 420); };

  return (
    <>
      <Row title="Sound effects" desc="Every button, switch and reward has its own gentle sound. Silent when your device is on silent.">
        <Switch checked={on} label="Sound effects" onChange={(v) => { updateSettings({ hudChimes: v }); if (v) window.setTimeout(() => sfx.preview('switchOn'), 30); }} />
      </Row>
      <div className={`st-sound${on ? '' : ' is-off'}`} aria-disabled={!on}>
        <Row stack title="Sound kit" desc="Soft is warm and wooden. Glass is brighter and airier. Voyage is ship timber, plucked notes and a small bell. Lantern is glass lanterns, a school handbell and soft celesta notes. Voyage and Lantern switch on with their worlds.">
          <Segmented<KitId> label="Sound kit" value={kit} options={KITS.map((k) => ({ value: k.id, label: k.label }))}
            onChange={(v) => { const had = sfx.isLoaded(v); updateSettings({ sfxKit: v }); sfx.configure({ kit: v }); if (!had) void sfx.load(v).then(() => sfx.preview('select')); }} />
        </Row>
        <Row stack title="Which taps make a sound" desc="Key moments keeps switches, ticks, notices and rewards, and leaves out plain taps and tab changes.">
          <Segmented<SfxLevel> label="Which taps make a sound" value={level} options={[{ value: 'full', label: 'Every tap' }, { value: 'light', label: 'Key moments' }]}
            onChange={(v) => { updateSettings({ sfxLevel: v }); sfx.configure({ level: v }); }} />
        </Row>
        <Row stack title="Volume" desc="Works together with your device volume.">
          <div className="st-vol">
            <LuVolume2 aria-hidden />
            <Range label="Sound effects volume" min={0} max={100} step={5} value={volume} onChange={(v) => updateSettings({ sfxVolume: v })} />
            <span className="tnum">{volume}%</span>
          </div>
        </Row>
        {canVibrate ? (
          <Row title="Vibration" desc="A tiny buzz with taps, ticks and rewards.">
            <Switch checked={settings.haptics !== false} label="Vibration" onChange={(v) => { updateSettings({ haptics: v }); sfx.configure({ haptics: v }); if (v) sfx.vibrate(12); }} />
          </Row>
        ) : null}
        <div className="st-lab" data-sfx="none">
          <div className="st-lab-head"><b>Sound lab</b><span>{ready ? 'Tap any sound to hear it.' : 'Loading the sounds…'}</span></div>
          {SOUND_GROUPS.map((g) => (
            <div className="st-lab-group" key={g}>
              <small>{g}</small>
              <div className="st-lab-row">
                {SOUND_NAMES.filter((n) => SOUNDS[n].group === g).map((n) => (
                  <button key={n} type="button" className="st-lab-btn" data-hit={last === n || undefined} disabled={!ready} onClick={() => audition(n)}>{SOUNDS[n].label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

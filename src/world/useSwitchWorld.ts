import { useCallback } from 'react';
import { useToast } from '../components/ui';
import { useStudy } from '../context/StudyContext';
import { sfx, type KitId } from '../lib/sfx';
import { normaliseWorld, type World } from './words';

/** Each themed world brings its own sound kit. The everyday look has none of its own: it gives back the kit the person had before. */
export const WORLD_KIT: Record<World, KitId | null> = { default: null, voyage: 'voyage', academy: 'lantern' };
export const isThemedKit = (k: unknown) => k === 'voyage' || k === 'lantern';

/** Switches the world and its sounds together. Used by the picker in Settings and by the invitation on each world's own screen. */
export function useSwitchWorld() {
  const { settings, updateSettings } = useStudy();
  const toast = useToast();
  const world = normaliseWorld(settings.worldTheme);
  return useCallback((w: World) => {
    if (w === world) return;
    const kit = WORLD_KIT[w];
    const current = settings.sfxKit ?? 'soft';
    // The kit to hand back later: only a plain kit counts, so going from one world to another keeps the one from before.
    const remembered: 'soft' | 'glass' = isThemedKit(current) ? (settings.sfxKitBefore ?? 'soft') : (current as 'soft' | 'glass');
    if (kit) {
      const ready = sfx.isLoaded(kit);
      updateSettings({ worldTheme: w, sfxKit: kit, sfxKitBefore: remembered });
      sfx.configure({ kit });
      sfx.play('rank');
      if (!ready && settings.hudChimes !== false) void sfx.load(kit).then((ok) => { if (ok) sfx.preview('rank'); });
    } else {
      // Leaving a world gives the old kit back, unless the person picked another kit while there.
      const back: KitId = isThemedKit(current) ? remembered : current;
      updateSettings({ worldTheme: 'default', sfxKit: back, sfxKitBefore: undefined });
      sfx.configure({ kit: back });
      sfx.play('select');
    }
    toast(w === 'voyage'
      ? { message: 'Welcome aboard', sub: 'Open the Sea chart to meet your crew. Your data has not changed.', tone: 'good' }
      : w === 'academy'
        ? { message: 'Welcome to Lanternfell', sub: 'Open the Grounds to be chosen for a house. Your data has not changed.', tone: 'good' }
        : { message: 'Back to the everyday look', sub: 'Your voyage and your school record are saved. Switch back any time.', tone: 'info' });
  }, [world, settings.sfxKit, settings.sfxKitBefore, settings.hudChimes, updateSettings, toast]);
}

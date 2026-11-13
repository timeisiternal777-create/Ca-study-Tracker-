// The people of Lanternfell. All original characters; none of them is a character from any book or film.
import { SKIN_NAMES, HAIR_COLOR_NAMES } from '../../../crew/Crew';

export type CastId = 'student' | 'vane' | 'bellweather' | 'madge' | 'reed';

export interface CastInfo { id: CastId; name: string; role: string; job: string }
export const CAST: Record<CastId, CastInfo> = {
  student: { id: 'student', name: 'You', role: 'Student', job: 'A lantern in one hand and a very long reading list in the other.' },
  vane: { id: 'vane', name: 'Headmistress Vane', role: 'Headmistress', job: 'Reads the draught: your pace against the exam date.' },
  bellweather: { id: 'bellweather', name: 'Archivist Bellweather', role: 'Archivist', job: 'Keeps the record: standing, trials and the school record.' },
  madge: { id: 'madge', name: 'Madge Ashdown', role: 'Lamplighter', job: 'Keeps the windows lit: breaks, streaks and the lantern post.' },
  reed: { id: 'reed', name: 'Warden Reed', role: 'Trial Warden', job: 'Runs the trials and notices the buildings gathering dust.' },
};
/** The four who talk to the student, in the order they appear on the Grounds screen. */
export const CAST_ORDER: CastId[] = ['vane', 'bellweather', 'reed', 'madge'];

// ───────────────────────────── the student's look ─────────────────────────────
/** Indexes into the lists below (skin and hair colours come from the shared lists of the crew's face system). */
export interface StudentLook { skin: number; hair: number; hairColor: number; robe: number; accessory: number }
export const STUDENT_CHOICES: Record<keyof StudentLook, number> = { skin: 6, hair: 4, hairColor: 7, robe: 6, accessory: 4 };
export const DEFAULT_STUDENT: StudentLook = { skin: 2, hair: 1, hairColor: 0, robe: 0, accessory: 0 };
/** Plain robe cloth. The house colours come from the scarf and the pin, so a robe never clashes with a house. */
export const ROBE_COLORS = ['#26335c', '#4b2c58', '#2c4f40', '#343b48', '#5c2634', '#68452a'];
export const ROBE_NAMES = ['Midnight', 'Plum', 'Moss', 'Slate', 'Wine', 'Walnut'];
export const STUDENT_HAIR_NAMES = ['Short crop', 'Long waves', 'Top bun', 'Curly puff'];
export const STUDENT_ACCESSORY_NAMES = ['None', 'Scholar cap', 'Ribbon', 'Round glasses'];
export { SKIN_NAMES, HAIR_COLOR_NAMES };

const clampTo = (v: unknown, n: number, fallback: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n ? v : fallback);
/** Anything read back from storage is checked here, so a damaged value can never crash the drawing. */
export function normaliseLook(raw: unknown): StudentLook {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    skin: clampTo(r.skin, STUDENT_CHOICES.skin, DEFAULT_STUDENT.skin),
    hair: clampTo(r.hair, STUDENT_CHOICES.hair, DEFAULT_STUDENT.hair),
    hairColor: clampTo(r.hairColor, STUDENT_CHOICES.hairColor, DEFAULT_STUDENT.hairColor),
    robe: clampTo(r.robe, STUDENT_CHOICES.robe, DEFAULT_STUDENT.robe),
    accessory: clampTo(r.accessory, STUDENT_CHOICES.accessory, DEFAULT_STUDENT.accessory),
  };
}

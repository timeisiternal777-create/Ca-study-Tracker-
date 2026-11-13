import { useId, type CSSProperties } from 'react';
import './blip.css';

export type BlipMood = 'idle' | 'happy' | 'wave' | 'cheer' | 'think' | 'sleepy' | 'worry' | 'wow' | 'proud';

const INK = '#17122e';
/** Warm brown used for the outline of every golden part, so the cel shading reads on light and dark backgrounds. */
const LINE = '#8a4a0e';
const FUR = '#b86a14';
const BODY = 'M60 26C83.5 26 101 44 101 68.5 101 90.5 85.5 103 60 103 34.5 103 19 90.5 19 68.5 19 44 36.5 26 60 26Z';

/** A limb drawn as a tube: dark outline, gradient body and a thin highlight. */
function Tube({ d, w, fill, hi = true, flip = false }: { d: string; w: number; fill: string; hi?: boolean; /** the limb sits inside a mirrored group, so keep the highlight on the lit side */ flip?: boolean }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={LINE} strokeOpacity=".58" strokeWidth={w + 2.2} />
      <path d={d} stroke={fill} strokeWidth={w} />
      {hi && <path d={d} stroke="#fff" strokeOpacity=".5" strokeWidth={w * 0.26} transform={`translate(${(flip ? 1 : -1) * w * 0.2} ${-w * 0.05})`} />}
    </g>
  );
}

/** A mitten hand: palm, thumb and two finger grooves, drawn pointing down at its own origin. The caller places it. */
function Hand({ fill }: { fill: string }) {
  return (
    <g>
      <ellipse cx="5" cy="-2.2" rx="2.5" ry="3.5" transform="rotate(-26 5 -2.2)" fill={fill} stroke={LINE} strokeOpacity=".55" strokeWidth="1.1" />
      <circle r="6.3" fill={fill} stroke={LINE} strokeOpacity=".6" strokeWidth="1.3" />
      <path d="M-2 2.4V5.8M1.9 2.4V5.8" stroke={FUR} strokeOpacity=".7" strokeWidth=".95" strokeLinecap="round" />
      <path d="M-4.6 -2.2Q-2.4 -4.9 .4 -4.9" stroke="#fff" strokeOpacity=".62" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

/** One foot: a wide toe cap with three toe lines and a darker sole. */
function Foot({ x, fill }: { x: number; fill: string }) {
  return (
    <g transform={`translate(${x} 102.4)`}>
      <path d="M-12.6 5.4C-12.6 .2 -7 -3.6 .4 -3.6 7.8 -3.6 12.6 .2 12.6 5.2 12.6 9.4 8.8 11.6 0 11.6-8.6 11.6-12.6 9.6-12.6 5.4Z" fill={fill} stroke={LINE} strokeOpacity=".6" strokeWidth="1.3" />
      <path d="M-11.6 6.8Q0 12.6 11.6 6.8" stroke={FUR} strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
      <path className="blip-fine" d="M-5 6.4Q-4.5 8.7 -5.1 10.2M1.2 6.7Q1.5 9 .9 10.5M7 6Q7.4 8.2 6.8 9.6" stroke={FUR} strokeOpacity=".7" strokeWidth=".9" strokeLinecap="round" />
      <path d="M-8.8 .4Q-5 -2.2 -.4 -1.9" stroke="#fff" strokeOpacity=".6" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

/** One big eye. A lower glow in the theme accent and two highlights give it depth. */
function Eye({ cx, cy, rx, ry, glow, hi }: { cx: number; cy: number; rx: number; ry: number; glow: string; hi: number }) {
  return (
    <g className="blip-eye">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK} />
      <ellipse cx={cx} cy={cy + ry * 0.5} rx={rx * 0.74} ry={ry * 0.42} fill={glow} />
      <circle cx={cx - rx * 0.36} cy={cy - ry * 0.42} r={hi} fill="#fff" />
      <circle cx={cx + rx * 0.38} cy={cy + ry * 0.5} r="1.15" fill="#fff" opacity=".9" />
      <circle cx={cx + rx * 0.5} cy={cy - ry * 0.2} r=".6" fill="#fff" opacity=".7" />
    </g>
  );
}

/**
 * Blip is the dot on the study radar that came to life.
 * Every part is a plain SVG shape, so it can be edited in any vector tool, and it picks up the
 * theme accent for its dish light, eye glow, cuffs and the radar screen on its belly. Motion is CSS only (transform and opacity).
 */
export function Blip({ mood = 'idle', size = 96, gaze, className, title, still }: {
  mood?: BlipMood; size?: number; /** where the eyes look, each from -1 to 1 */ gaze?: { x: number; y: number };
  className?: string; title?: string; /** turn off idle motion */ still?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = gaze ?? (mood === 'think' ? { x: 0.7, y: -0.8 } : { x: 0, y: 0 });
  const eyeShift: CSSProperties = { transform: `translate(${(g.x * 2.6).toFixed(2)}px, ${(g.y * 2.2).toFixed(2)}px)` };

  const arc = mood === 'happy' || mood === 'cheer' || mood === 'proud';
  const closed = mood === 'sleepy';
  const big = mood === 'wow';
  const blush = mood === 'proud' || mood === 'cheer' ? 0.95 : 0.7;
  const limb = `url(#${id}l)`;
  /** small copies drop the finest details (see blip.css) */
  const tier = size < 44 ? ' blip--tiny' : size < 64 ? ' blip--small' : '';

  return (
    <span className={`blip blip--${mood}${tier}${still ? ' is-still' : ''}${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <svg viewBox="0 0 120 120" width={size} height={size} fill="none">
        <defs>
          <radialGradient id={`${id}b`} cx="36%" cy="26%" r="92%">
            <stop offset="0" stopColor="#fff2bd" />
            <stop offset=".36" stopColor="#ffdb6c" />
            <stop offset=".78" stopColor="#f5ac3a" />
            <stop offset="1" stopColor="#e08d22" />
          </radialGradient>
          <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd860" />
            <stop offset="1" stopColor="#e99c2a" />
          </linearGradient>
          <radialGradient id={`${id}f`} cx="50%" cy="22%" r="85%">
            <stop offset="0" stopColor="#fffdea" />
            <stop offset="1" stopColor="#ffe9a2" />
          </radialGradient>
          <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6d6" />
            <stop offset=".55" stopColor="#f0cd7e" />
            <stop offset="1" stopColor="#c58f33" />
          </linearGradient>
          <radialGradient id={`${id}e`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="var(--a)" stopOpacity=".95" />
            <stop offset="1" stopColor="var(--a)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}k`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ff6f86" stopOpacity=".95" />
            <stop offset="1" stopColor="#ff6f86" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}c`}><path d={BODY} /></clipPath>
        </defs>

        <ellipse className="blip-shadow" cx="60" cy="113" rx="29" ry="4.4" fill="#000" opacity=".34" />

        <g className="blip-float">
          {/* antenna: a short mast with a joint ring and a small radar dish, its feed light in the theme accent */}
          <g className="blip-ant">
            <Tube d="M60 28.5C59.4 25 59.6 21.8 60.2 19" w={3.1} fill={`url(#${id}m)`} hi={false} />
            <rect x="57.9" y="22.3" width="4.4" height="2.3" rx="1" fill="#f3d58d" stroke={LINE} strokeOpacity=".6" strokeWidth=".9" />
            <g transform="translate(62.4 13.2) rotate(21)">
              <path d="M-6.6 0C-5.8 5 -2.6 6.6 0 6.6 2.6 6.6 5.8 5 6.6 0Z" fill={`url(#${id}m)`} stroke={LINE} strokeOpacity=".62" strokeWidth="1.1" strokeLinejoin="round" />
              <path d="M0 6.6V9.6" stroke={LINE} strokeOpacity=".6" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M0 6.6V9.6" stroke="#f3d58d" strokeWidth="1.1" strokeLinecap="round" />
              <ellipse rx="6.6" ry="2.6" fill="#24405c" stroke="#f6dc9a" strokeWidth="1.25" />
              <path d="M-4.2 .9Q0 2.5 4.2 .9" stroke="#79c4dc" strokeOpacity=".7" strokeWidth=".85" strokeLinecap="round" />
              <path d="M0 0V-6.3" stroke={LINE} strokeOpacity=".6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 0V-6.3" stroke="#f3d58d" strokeWidth=".95" strokeLinecap="round" />
            </g>
            <circle className="blip-ping a" cx="65.1" cy="6.3" r="3.4" stroke="var(--a)" strokeWidth="1.5" />
            <circle className="blip-ping b" cx="65.1" cy="6.3" r="3.4" stroke="var(--a)" strokeWidth="1.5" />
            <circle className="blip-bulb" cx="65.1" cy="6.3" r="2.9" fill="var(--a)" stroke={LINE} strokeOpacity=".5" strokeWidth=".8" />
            <circle cx="64.2" cy="5.3" r="1" fill="#fff" opacity=".92" />
          </g>

          {/* feet and arms sit behind the body */}
          <Foot x={45} fill={limb} />
          <Foot x={75} fill={limb} />
          <g className="blip-arm l">
            <Tube d="M23.6 66.2C18.6 69.6 15.4 75.6 14.4 83" w={8.2} fill={limb} />
            <path d="M9.9 81.6Q14.2 84 18.6 81.8" stroke={LINE} strokeOpacity=".55" strokeWidth="3.7" strokeLinecap="round" />
            <path d="M9.9 81.6Q14.2 84 18.6 81.8" stroke="var(--a)" strokeWidth="2.5" strokeLinecap="round" />
            <g transform="translate(14.8 87.6)"><Hand fill={limb} /></g>
          </g>
          <g className="blip-arm r">
            {mood === 'think' ? (
              <Tube d="M96.6 66C101.2 69.4 103.6 77 102.4 84" w={8.2} fill={limb} />
            ) : (
              <g transform="matrix(-1 0 0 1 120 0)">
                <Tube d="M23.6 66.2C18.6 69.6 15.4 75.6 14.4 83" w={8.2} fill={limb} flip />
                <path d="M9.9 81.6Q14.2 84 18.6 81.8" stroke={LINE} strokeOpacity=".55" strokeWidth="3.7" strokeLinecap="round" />
                <path d="M9.9 81.6Q14.2 84 18.6 81.8" stroke="var(--a)" strokeWidth="2.5" strokeLinecap="round" />
                <g transform="translate(14.8 87.6)"><Hand fill={limb} /></g>
              </g>
            )}
          </g>

          <g className="blip-body">
            {/* the body: soft gradient, a hard shade crescent, an accent rim light on the shadow side and a glossy highlight */}
            <path d={BODY} fill={`url(#${id}b)`} />
            <g clipPath={`url(#${id}c)`}>
              <path d="M0 0H120V120H0ZM8 62a44 42 0 1 0 88 0a44 42 0 1 0-88 0Z" fillRule="evenodd" fill="#c9741a" opacity=".24" />
              <path d="M100.6 60C102.6 77 93 96 70 102.4" stroke="#ffe7a6" strokeOpacity=".62" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M96.4 64C98 77 90.6 92 73 98.2" stroke="#fff" strokeOpacity=".3" strokeWidth=".9" strokeLinecap="round" />
            </g>
            <path d={BODY} stroke={LINE} strokeOpacity=".5" strokeWidth="1.6" />
            <path d="M31.5 47C35.5 37 45.5 31.4 55.5 30.4" stroke="#fff" strokeOpacity=".78" strokeWidth="4.4" strokeLinecap="round" />
            <circle cx="27.6" cy="56" r="1.7" fill="#fff" opacity=".78" />
            {/* the mast sits in a bolted collar */}
            <ellipse cx="60" cy="27.6" rx="8" ry="3.2" fill={`url(#${id}m)`} stroke={LINE} strokeOpacity=".62" strokeWidth="1.1" />
            <ellipse cx="60" cy="27" rx="5.2" ry="1.9" fill="#fff3cc" stroke={LINE} strokeOpacity=".4" strokeWidth=".7" />
            <circle className="blip-fine" cx="54.4" cy="28.5" r=".95" fill="#a8671a" /><circle className="blip-fine" cx="65.6" cy="28.5" r=".95" fill="#a8671a" />

            {/* the belly patch with its stitching, and a tiny radar screen */}
            <ellipse cx="60" cy="91.4" rx="19" ry="9.2" fill={`url(#${id}f)`} stroke={FUR} strokeOpacity=".28" strokeWidth="1" />
            <ellipse className="blip-fine" cx="60" cy="91.4" rx="16.9" ry="7.3" stroke="#d99a30" strokeOpacity=".55" strokeWidth=".8" strokeDasharray="1.7 2.1" />
            <g className="blip-mark">
              <circle cx="60" cy="91.8" r="6.9" fill="#122238" stroke="#e8b04a" strokeWidth="1.5" />
              <circle cx="60" cy="91.8" r="4.4" stroke="var(--a)" strokeOpacity=".5" strokeWidth=".6" />
              <circle cx="60" cy="91.8" r="2" stroke="var(--a)" strokeOpacity=".5" strokeWidth=".6" />
              <path d="M60 85.2V98.4M53.4 91.8H66.6" stroke="var(--a)" strokeOpacity=".28" strokeWidth=".5" />
              <path className="blip-sweep" d="M60 91.8V85.4A6.4 6.4 0 0 1 65.4 88.6Z" fill="var(--a)" opacity=".8" />
              <circle cx="63.4" cy="94.2" r="1" fill="#ffd45a" />
              <path d="M55.6 88.8Q57 86.6 59.6 86" stroke="#fff" strokeOpacity=".5" strokeWidth=".9" strokeLinecap="round" />
            </g>

            {/* cheeks: a soft blush with three little marks */}
            <ellipse className="blip-cheek" cx="33.5" cy="76.4" rx="7.4" ry="4.6" fill={`url(#${id}k)`} opacity={blush} />
            <ellipse className="blip-cheek" cx="86.5" cy="76.4" rx="7.4" ry="4.6" fill={`url(#${id}k)`} opacity={blush} />
            <g className="blip-fine" stroke="#ff6f86" strokeOpacity=".7" strokeWidth=".9" strokeLinecap="round">
              <path d="M30.4 74.4l-1 2.2M33.4 74.2l-1 2.2M36.4 74.4l-1 2.2" />
              <path d="M83.6 74.4l-1 2.2M86.6 74.2l-1 2.2M89.6 74.4l-1 2.2" />
            </g>

            {/* eyes */}
            <g className="blip-eyes" style={eyeShift}>
              {arc ? (
                <>
                  <path d="M38.4 65.4Q45 53.4 51.6 65.4" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
                  <path d="M68.4 65.4Q75 53.4 81.6 65.4" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
                </>
              ) : closed ? (
                <>
                  <path d="M38.4 62.4Q45 69 51.6 62.4" stroke={INK} strokeWidth="3.1" strokeLinecap="round" />
                  <path d="M68.4 62.4Q75 69 81.6 62.4" stroke={INK} strokeWidth="3.1" strokeLinecap="round" />
                  <path d="M40 66.2l-1.6 1.6M44 68.2l-.4 2M49.6 66.6l1.4 1.8M70 66.6l-1.4 1.8M76 68.2l.4 2M80 66.2l1.6 1.6" stroke={INK} strokeOpacity=".7" strokeWidth="1" strokeLinecap="round" className="blip-fine" />
                </>
              ) : (
                <>
                  <Eye cx={45} cy={62} rx={big ? 7.6 : 6.6} ry={big ? 10.8 : 9.4} glow={`url(#${id}e)`} hi={big ? 3.1 : 2.6} />
                  <Eye cx={75} cy={62} rx={big ? 7.6 : 6.6} ry={big ? 10.8 : 9.4} glow={`url(#${id}e)`} hi={big ? 3.1 : 2.6} />
                </>
              )}
            </g>

            {/* brows: a soft pair on the calm moods, sharper ones when worried or thinking */}
            {(mood === 'idle' || mood === 'wave') && (<><path d="M38.6 50.6Q45 46.6 51.2 49.6" stroke={FUR} strokeOpacity=".85" strokeWidth="2.1" strokeLinecap="round" /><path d="M68.8 49.6Q75 46.6 81.4 50.6" stroke={FUR} strokeOpacity=".85" strokeWidth="2.1" strokeLinecap="round" /></>)}
            {mood === 'wow' && (<><path d="M38.2 46.4Q45 41.4 51.8 45.4" stroke={FUR} strokeOpacity=".85" strokeWidth="2.1" strokeLinecap="round" /><path d="M68.2 45.4Q75 41.4 81.8 46.4" stroke={FUR} strokeOpacity=".85" strokeWidth="2.1" strokeLinecap="round" /></>)}
            {mood === 'worry' && (<><path d="M37.5 50.5L52 46.2" stroke={INK} strokeWidth="2.7" strokeLinecap="round" /><path d="M82.5 50.5L68 46.2" stroke={INK} strokeWidth="2.7" strokeLinecap="round" /></>)}
            {mood === 'think' && (<><path d="M37.5 49Q45 43.4 52.6 47.4" stroke={INK} strokeWidth="2.7" strokeLinecap="round" /><path d="M68 51.6H81" stroke={INK} strokeWidth="2.7" strokeLinecap="round" /></>)}

            {/* mouth */}
            {mood === 'cheer' ? (
              <>
                <path d="M51.2 73.4Q60 92.6 68.8 73.4Z" fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M54.6 82.2Q60 77 65.4 82.2Q60 86.8 54.6 82.2Z" fill="#ff7388" />
                <path d="M54.8 74.4H65.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".92" />
              </>
            ) : mood === 'wow' ? (
              <>
                <ellipse cx="60" cy="80.4" rx="4" ry="5.3" fill={INK} />
                <ellipse cx="60" cy="83" rx="2.3" ry="1.9" fill="#ff7388" />
              </>
            ) : mood === 'sleepy' ? <ellipse className="blip-snore" cx="60" cy="79.5" rx="2.5" ry="2.9" fill={INK} />
              : mood === 'worry' ? <path d="M53.5 81.6Q56.7 77.6 60 80.2T66.5 79.4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
              : mood === 'think' ? <path d="M55 79.8Q59.6 77.2 65.6 79.2" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
              : mood === 'proud' ? <><path d="M52.6 75.4Q60 86 67.4 75.4" stroke={INK} strokeWidth="2.8" strokeLinecap="round" /><path d="M50.8 74.2Q51.2 76 52.6 76.6M69.2 74.2Q68.8 76 67.4 76.6" stroke={INK} strokeWidth="1.3" strokeLinecap="round" /></>
              : <><path d="M54 76.4Q60 83.2 66 76.4" stroke={INK} strokeWidth="2.8" strokeLinecap="round" /><path d="M52.6 75.6Q52.9 76.9 54 77.3M67.4 75.6Q67.1 76.9 66 77.3" stroke={INK} strokeOpacity=".7" strokeWidth="1.05" strokeLinecap="round" /></>}
          </g>
        </g>

        {mood === 'think' && (
          <g className="blip-hand">
            {/* the forearm comes up from a jointed elbow and the hand rests against the cheek */}
            <g transform="translate(89 76) rotate(121)">
              <Tube d="M0 -15.6V-3" w={8.2} fill={limb} />
              <path d="M-5 -8.8Q0 -7 5 -8.8" stroke={LINE} strokeOpacity=".55" strokeWidth="3.7" strokeLinecap="round" />
              <path d="M-5 -8.8Q0 -7 5 -8.8" stroke="var(--a)" strokeWidth="2.5" strokeLinecap="round" />
              <Hand fill={limb} />
            </g>
            <circle cx="102.4" cy="84" r="4.5" fill={limb} stroke={LINE} strokeOpacity=".6" strokeWidth="1.3" />
            <circle cx="102.4" cy="84" r="1.7" fill="var(--a)" stroke={LINE} strokeOpacity=".5" strokeWidth=".7" />
          </g>
        )}

        {/* mood extras */}
        {mood === 'cheer' && (
          <g className="blip-sparks" fill="var(--c-gold)">
            <g transform="translate(-1 -13)"><path className="s1" d="M9 28l2.2 5.8L17 36l-5.8 2.2L9 44l-2.2-5.8L1 36l5.8-2.2z" /></g>
            <g transform="translate(5 -9)"><path className="s2" d="M108 22l1.8 4.8 4.8 1.8-4.8 1.8L108 35l-1.8-4.8-4.8-1.8 4.8-1.8z" /></g>
            <path className="s3" d="M30 13l1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3z" fill="var(--a)" />
          </g>
        )}
        {mood === 'sleepy' && (
          <g className="blip-zzz" stroke="var(--tx-1)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path className="z1" d="M92 30h8l-8 9.5h8" />
            <path className="z2" d="M104 14h5.6l-5.6 6.6h5.6" />
          </g>
        )}
        {mood === 'worry' && (
          <g className="blip-drop">
            <path d="M97 36C101.5 43 103.2 46.2 97 49.4 90.8 46.2 92.5 43 97 36Z" fill="var(--c-cyan)" opacity=".92" />
            <path d="M95.2 42.4Q94.4 44.6 95.6 46" stroke="#fff" strokeOpacity=".7" strokeWidth="1" strokeLinecap="round" />
          </g>
        )}
        {mood === 'think' && (
          <g className="blip-dots" fill="var(--tx-1)">
            <circle className="d1" cx="94" cy="38" r="2" />
            <circle className="d2" cx="101" cy="31" r="2.8" />
            <circle className="d3" cx="110" cy="22" r="3.8" />
          </g>
        )}
      </svg>
    </span>
  );
}

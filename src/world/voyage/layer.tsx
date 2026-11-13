import type { CSSProperties, ReactNode } from 'react';
import type { Box } from './art';

// Helpers for building a scene out of layers. A scene has a fixed shape (say 1200 by 620); every layer is placed in percentages of it,
// so the scene scales to its container and the layers stay lined up. A layer holds a picture that is painted once; CSS slides or fades the layer.

export const vb = (b: Box) => `${b.x} ${b.y} ${b.w} ${b.h}`;
export const pc = (n: number, of: number) => `${Math.round((n / of) * 10000) / 100}%`;
/** A CSS custom property, typed so it can sit in a style object. */
export const cv = (name: string, v: string | number) => ({ [name]: v }) as CSSProperties;

export function placer(stageW: number, stageH: number) {
  return {
    /** Put a layer's box at a scene position. For things that never move. */
    at(b: Box, cx: number, cy: number, s = 1): CSSProperties {
      return { left: pc(cx + b.x * s, stageW), top: pc(cy + b.y * s, stageH), width: pc(b.w * s, stageW), height: pc(b.h * s, stageH) };
    },
    /** The same place, reached by a transform from the top-left corner, so the layer can move (and the move can be animated) without layout. */
    to(b: Box, cx: number, cy: number, s = 1): CSSProperties {
      const w = b.w * s, h = b.h * s;
      return { width: pc(w, stageW), height: pc(h, stageH), transform: `translate3d(${pc(cx + b.x * s, w)},${pc(cy + b.y * s, h)},0)` };
    },
  };
}

/** A small layer that holds one picture. */
export function Layer({ box, className, style, children }: { box: Box; className: string; style?: CSSProperties; children: ReactNode }) {
  return <div className={className} style={style} aria-hidden><svg viewBox={vb(box)}>{children}</svg></div>;
}

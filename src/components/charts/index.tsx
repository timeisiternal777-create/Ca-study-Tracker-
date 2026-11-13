// Dependency-free SVG chart kit. Hover work is done directly on the DOM (no React renders per pointer move).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { LuTable2, LuChartLine } from 'react-icons/lu';
import './charts.css';
import { cn } from '../../lib/format';

/* ───────── utils ───────── */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function niceTicks(max: number, count = 4, min = 0): number[] {
  const span = Math.max(max - min, 1e-9);
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(6));
  return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Monotone cubic path through points (no overshoot). Points with null y split the path. */
function linePath(pts: ({ x: number; y: number } | null)[], smooth: boolean): string {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  for (const p of pts) { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }
  if (cur.length) segs.push(cur);
  return segs.map((s) => {
    if (s.length === 1) return `M${s[0].x},${s[0].y}h0.01`;
    if (!smooth || s.length < 3) return 'M' + s.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L');
    const n = s.length; const dx: number[] = []; const m: number[] = []; const sl: number[] = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = s[i + 1].x - s[i].x; sl[i] = (s[i + 1].y - s[i].y) / (dx[i] || 1); }
    m[0] = sl[0]; m[n - 1] = sl[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = sl[i - 1] * sl[i] <= 0 ? 0 : (sl[i - 1] + sl[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (sl[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / sl[i], b = m[i + 1] / sl[i], h = Math.hypot(a, b);
      if (h > 3) { const t = 3 / h; m[i] = t * a * sl[i]; m[i + 1] = t * b * sl[i]; }
    }
    let d = `M${s[0].x.toFixed(1)},${s[0].y.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const x1 = s[i].x + dx[i] / 3, y1 = s[i].y + (m[i] * dx[i]) / 3, x2 = s[i + 1].x - dx[i] / 3, y2 = s[i + 1].y - (m[i + 1] * dx[i]) / 3;
      d += `C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${s[i + 1].x.toFixed(1)},${s[i + 1].y.toFixed(1)}`;
    }
    return d;
  }).join('');
}

function roundTop(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/* ───────── tooltip ───────── */
interface TipRow { color?: string; label: string; value: string }
function useTip() {
  const ref = useRef<HTMLDivElement>(null);
  const show = useCallback((x: number, y: number, title: string, rows: TipRow[], boxW: number) => {
    const el = ref.current; if (!el) return;
    el.innerHTML = `<div class="ch-tip-t">${esc(title)}</div>` + rows.map((r) => `<div class="ch-tip-r">${r.color ? `<i style="background:${r.color}"></i>` : ''}<span>${esc(r.label)}</span><b>${esc(r.value)}</b></div>`).join('');
    el.dataset.on = 'true';
    const w = el.offsetWidth;
    const left = x + 14 + w > boxW ? x - 14 - w : x + 14;
    el.style.transform = `translate3d(${Math.max(0, left)}px, ${Math.max(0, y)}px, 0)`;
  }, []);
  const hide = useCallback(() => { const el = ref.current; if (el) el.dataset.on = 'false'; }, []);
  return { ref, show, hide };
}

/* ───────── card, legend, table ───────── */
export interface LegendItem { id: string; label: string; color: string }
export function Legend({ items, hidden = [], onToggle }: { items: LegendItem[]; hidden?: string[]; onToggle?: (id: string) => void }) {
  return (
    <ul className="ch-legend">
      {items.map((it) => (
        <li key={it.id}>
          <button type="button" aria-pressed={!hidden.includes(it.id)} disabled={!onToggle} onClick={() => onToggle?.(it.id)}>
            <i style={{ background: it.color }} />{it.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ChartTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="ch-table-wrap">
      <table className="ch-table">
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Frame with title, legend and a chart/table switch (so values are always readable without colour). */
export function ChartCard({ title, sub, legend, actions, table, children, className }: {
  title: ReactNode; sub?: ReactNode; legend?: ReactNode; actions?: ReactNode; table?: ReactNode; children: ReactNode; className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn('ch-card', className)}>
      <header className="ch-head">
        <div className="min-0">
          <h3 className="ch-title">{title}</h3>
          {sub ? <p className="ch-sub">{sub}</p> : null}
        </div>
        <div className="row g-2">
          {actions}
          {table ? (
            <button type="button" className="icon-btn ch-switch" aria-pressed={asTable} aria-label={asTable ? 'Show chart' : 'Show data table'} title={asTable ? 'Show chart' : 'Show data table'} onClick={() => setAsTable((v) => !v)}>
              {asTable ? <LuChartLine /> : <LuTable2 />}
            </button>
          ) : null}
        </div>
      </header>
      {legend}
      {asTable && table ? table : children}
    </section>
  );
}

/* ───────── trend (line / area) ───────── */
export interface Series { id: string; label: string; color: string; values: (number | null)[]; dashed?: boolean; area?: boolean; width?: number }
export interface TrendProps {
  x: string[]; series: Series[]; height?: number; ariaLabel: string;
  yFormat?: (n: number) => string; valueFormat?: (n: number) => string; yMax?: number; yMin?: number;
  goal?: { value: number; label: string };
  tipTitle?: (i: number) => string; xTickLabel?: (i: number) => string; xTicks?: number; smooth?: boolean; hidden?: string[];
  /** Draw the line across missing values instead of breaking it. */
  connectGaps?: boolean;
  /** Draw a small dot on every data point (good for sparse series). */
  markers?: boolean;
}
const PAD = { l: 38, r: 12, t: 12, b: 26 };

export function TrendChart({ x, series, height = 240, ariaLabel, yFormat = (n) => String(n), valueFormat, yMax, yMin = 0, goal, tipTitle, xTickLabel, xTicks = 6, smooth = true, hidden = [], connectGaps, markers }: TrendProps) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const vis = useMemo(() => series.filter((s) => !hidden.includes(s.id)), [series, hidden]);
  const vf = valueFormat ?? yFormat;
  const n = x.length;
  const geo = useMemo(() => {
    const all = vis.flatMap((s) => s.values.filter((v): v is number => v != null));
    const top = Math.max(yMax ?? 0, ...all, goal?.value ?? 0, 1);
    const ticks = niceTicks(top * (yMax ? 1 : 1.06), 4, yMin);
    const hi = ticks[ticks.length - 1], lo = ticks[0];
    const iw = Math.max(10, w - PAD.l - PAD.r), ih = height - PAD.t - PAD.b;
    const px = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
    const py = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
    return { ticks, iw, ih, px, py };
  }, [vis, yMax, yMin, goal, w, height, n]);

  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const lineRef = useRef<SVGLineElement>(null);
  const idx = useRef(-1);
  const rectCache = useRef<DOMRect | null>(null);

  const showAt = useCallback((i: number) => {
    if (i < 0 || i >= n) return;
    idx.current = i;
    const X = geo.px(i);
    const ln = lineRef.current;
    if (ln) { ln.setAttribute('x1', String(X)); ln.setAttribute('x2', String(X)); ln.style.opacity = '1'; }
    const rows: TipRow[] = [];
    let minY = height;
    for (const s of vis) {
      const v = s.values[i];
      const d = dotRefs.current[s.id];
      if (d) {
        if (v == null) d.style.opacity = '0';
        else { const Y = geo.py(v); d.setAttribute('cx', String(X)); d.setAttribute('cy', String(Y)); d.style.opacity = '1'; minY = Math.min(minY, Y); }
      }
      if (v != null) rows.push({ color: s.color, label: s.label, value: vf(v) });
    }
    tip.show(X, Math.max(4, minY - 10), tipTitle ? tipTitle(i) : x[i], rows, w);
  }, [n, geo, vis, vf, tip, tipTitle, x, w, height]);

  const hideAll = useCallback(() => {
    idx.current = -1;
    if (lineRef.current) lineRef.current.style.opacity = '0';
    for (const k in dotRefs.current) { const d = dotRefs.current[k]; if (d) d.style.opacity = '0'; }
    tip.hide();
  }, [tip]);

  const raf = useRef(0);
  const onMove = (e: RPointerEvent) => {
    const rect = rectCache.current ?? (rectCache.current = e.currentTarget.getBoundingClientRect());
    const cx = e.clientX;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const rel = cx - rect.left;
      const i = Math.round(((rel - PAD.l) / geo.iw) * (n - 1));
      const c = Math.max(0, Math.min(n - 1, n <= 1 ? 0 : i));
      if (c !== idx.current) showAt(c);
    });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tickEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.min(xTicks, Math.floor(w / 70) || 2))));
  const base = geo.py(geo.ticks[0]);

  return (
    <div ref={wrap} className="ch-wrap" style={{ height }}>
      {w > 0 ? (
        <svg width={w} height={height} role="img" aria-label={ariaLabel} tabIndex={0} className="ch-svg"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); showAt(Math.min(n - 1, (idx.current < 0 ? -1 : idx.current) + 1)); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); showAt(Math.max(0, (idx.current < 0 ? n : idx.current) - 1)); }
            else if (e.key === 'Escape') hideAll();
          }} onBlur={hideAll}>
          <g className="ch-grid">
            {geo.ticks.map((t) => (<g key={t}><line x1={PAD.l} x2={w - PAD.r} y1={geo.py(t)} y2={geo.py(t)} /><text x={PAD.l - 8} y={geo.py(t)} dy="0.32em" textAnchor="end">{yFormat(t)}</text></g>))}
          </g>
          {goal ? (<g><line className="ch-goal" x1={PAD.l} x2={w - PAD.r} y1={geo.py(goal.value)} y2={geo.py(goal.value)} /><text className="ch-goal-t" x={w - PAD.r} y={geo.py(goal.value) - 6} textAnchor="end">{goal.label}</text></g>) : null}
          <g className="ch-xaxis">
            {x.map((lab, i) => (i % tickEvery === 0 ? <text key={i} x={geo.px(i)} y={height - 7} textAnchor={i === 0 ? 'start' : i >= n - 1 ? 'end' : 'middle'}>{xTickLabel ? xTickLabel(i) : lab}</text> : null))}
          </g>
          {vis.map((s, si) => {
            const pts = s.values.map((v, i) => (v == null ? null : { x: geo.px(i), y: geo.py(v) }));
            const d = linePath(connectGaps ? pts.filter(Boolean) : pts, smooth);
            const first = pts.find(Boolean), last = [...pts].reverse().find(Boolean);
            return (
              <g key={s.id} style={{ ['--i' as string]: si } as CSSProperties}>
                {s.area && first && last ? <path className="ch-area" d={`${d}L${last.x},${base}L${first.x},${base}Z`} style={{ fill: s.color }} /> : null}
                {markers ? pts.map((p, i) => (p ? <circle key={i} className="ch-mk" cx={p.x} cy={p.y} r={3.5} style={{ fill: s.color }} /> : null)) : null}
                <path className="ch-line" d={d} pathLength={1} style={{ stroke: s.color, strokeWidth: s.width ?? 2, strokeDasharray: s.dashed ? '5 5' : undefined }} data-dashed={s.dashed || undefined} />
              </g>
            );
          })}
          <line ref={lineRef} className="ch-cross" x1={0} x2={0} y1={PAD.t} y2={PAD.t + geo.ih} />
          {vis.map((s) => <circle key={s.id} ref={(el) => { dotRefs.current[s.id] = el; }} className="ch-dot" r={4.5} cx={0} cy={0} style={{ fill: s.color }} />)}
          <rect className="ch-hit" x={PAD.l} y={PAD.t} width={geo.iw} height={geo.ih} onPointerEnter={(e) => { rectCache.current = e.currentTarget.getBoundingClientRect(); }} onPointerMove={onMove} onPointerLeave={hideAll} />
        </svg>
      ) : null}
      <div className="ch-tip" ref={tip.ref} data-on="false" role="status" aria-live="polite" />
    </div>
  );
}

/* ───────── bars (vertical, grouped by category, optional stack) ───────── */
export interface BarSeries { id: string; label: string; color: string; values: number[] }
export interface BarProps {
  x: string[]; series: BarSeries[]; height?: number; ariaLabel: string; stacked?: boolean;
  yFormat?: (n: number) => string; valueFormat?: (n: number) => string;
  goal?: { value: number; label: string }; tipTitle?: (i: number) => string; xTickLabel?: (i: number) => string; hot?: number; hidden?: string[]; yMax?: number;
  /** Per-bar colour override (single series). */
  colorAt?: (i: number) => string | undefined;
}

export function BarChart({ x, series, height = 220, ariaLabel, stacked, yFormat = (n) => String(n), valueFormat, goal, tipTitle, xTickLabel, hot, hidden = [], yMax, colorAt }: BarProps) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const vf = valueFormat ?? yFormat;
  const vis = useMemo(() => series.filter((s) => !hidden.includes(s.id)), [series, hidden]);
  const n = x.length;
  const geo = useMemo(() => {
    const totals = x.map((_, i) => (stacked ? vis.reduce((a, s) => a + (s.values[i] || 0), 0) : Math.max(0, ...vis.map((s) => s.values[i] || 0))));
    const top = Math.max(yMax ?? 0, ...totals, goal?.value ?? 0, 1);
    const ticks = niceTicks(top * (yMax ? 1 : 1.05), 4, 0);
    const hi = ticks[ticks.length - 1];
    const iw = Math.max(10, w - PAD.l - PAD.r), ih = height - PAD.t - PAD.b;
    const band = iw / Math.max(n, 1);
    const py = (v: number) => PAD.t + ih - (v / (hi || 1)) * ih;
    return { ticks, iw, ih, band, py, totals };
  }, [x, vis, stacked, yMax, goal, w, height, n]);

  const svgRef = useRef<SVGSVGElement>(null);
  const cur = useRef(-1);
  const setHot = useCallback((i: number) => {
    cur.current = i;
    svgRef.current?.querySelectorAll<SVGElement>('[data-bar]').forEach((el) => { el.classList.toggle('is-dim', i >= 0 && Number(el.dataset.bar) !== i); });
  }, []);
  const showAt = useCallback((i: number) => {
    if (i < 0 || i >= n) return;
    setHot(i);
    const rows: TipRow[] = vis.map((s) => ({ color: s.color, label: s.label, value: vf(s.values[i] || 0) }));
    if (stacked && vis.length > 1) rows.push({ label: 'Total', value: vf(geo.totals[i]) });
    const cx = PAD.l + geo.band * (i + 0.5);
    tip.show(cx, Math.max(4, geo.py(geo.totals[i]) - 10 - rows.length * 8), tipTitle ? tipTitle(i) : x[i], rows, w);
  }, [n, setHot, vis, vf, stacked, geo, tip, tipTitle, x, w]);
  const hide = useCallback(() => { setHot(-1); tip.hide(); }, [setHot, tip]);

  const tickEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 46) || 2)));
  const bw = Math.min(geo.band * 0.62, 44);
  const per = stacked ? 1 : Math.max(vis.length, 1);
  const subw = stacked ? bw : (bw + (per - 1) * 0) / per;

  return (
    <div ref={wrap} className="ch-wrap" style={{ height }}>
      {w > 0 ? (
        <svg ref={svgRef} width={w} height={height} role="img" aria-label={ariaLabel} className="ch-svg" tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); showAt(Math.min(n - 1, cur.current + 1)); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); showAt(Math.max(0, (cur.current < 0 ? n : cur.current) - 1)); }
            else if (e.key === 'Escape') hide();
          }} onBlur={hide}>
          <g className="ch-grid">
            {geo.ticks.map((t) => (<g key={t}><line x1={PAD.l} x2={w - PAD.r} y1={geo.py(t)} y2={geo.py(t)} /><text x={PAD.l - 8} y={geo.py(t)} dy="0.32em" textAnchor="end">{yFormat(t)}</text></g>))}
          </g>
          <g className="ch-xaxis">
            {x.map((lab, i) => (i % tickEvery === 0 ? <text key={i} x={PAD.l + geo.band * (i + 0.5)} y={height - 7} textAnchor="middle" className={i === hot ? 'is-hot' : undefined}>{xTickLabel ? xTickLabel(i) : lab}</text> : null))}
          </g>
          {x.map((_, i) => {
            const cx = PAD.l + geo.band * (i + 0.5);
            let acc = 0;
            return (
              <g key={i} data-bar={i} className="ch-bar">
                {vis.map((s, si) => {
                  const v = s.values[i] || 0;
                  if (v <= 0) return null;
                  const color = (!stacked && vis.length === 1 && colorAt?.(i)) || s.color;
                  let bx: number, y0: number, h: number;
                  if (stacked) { bx = cx - bw / 2; const y1 = geo.py(acc + v); y0 = y1; h = geo.py(acc) - y1 - (acc > 0 ? 2 : 0); acc += v; }
                  else { bx = cx - bw / 2 + si * subw; y0 = geo.py(v); h = geo.py(0) - y0; }
                  const topmost = !stacked || si === vis.length - 1 || vis.slice(si + 1).every((q) => !(q.values[i] > 0));
                  return <path key={s.id} d={topmost ? roundTop(bx, y0, Math.max(subw - (stacked ? 0 : 2), 2), h, 5) : `M${bx},${y0}h${subw}v${Math.max(h, 0)}h${-subw}Z`}
                    className="ch-barpath" style={{ fill: color, ['--d' as string]: `${i * 14}ms`, opacity: hot != null && hot >= 0 && hot !== i ? 0.55 : undefined } as CSSProperties} />;
                })}
              </g>
            );
          })}
          {goal ? (<g><line className="ch-goal" x1={PAD.l} x2={w - PAD.r} y1={geo.py(goal.value)} y2={geo.py(goal.value)} /><text className="ch-goal-t" x={w - PAD.r} y={geo.py(goal.value) - 6} textAnchor="end">{goal.label}</text></g>) : null}
          {x.map((_, i) => (
            <rect key={i} className="ch-hit" x={PAD.l + geo.band * i} y={PAD.t} width={geo.band} height={geo.ih} onPointerEnter={() => showAt(i)} onPointerMove={() => { if (cur.current !== i) showAt(i); }} onPointerLeave={hide} />
          ))}
        </svg>
      ) : null}
      <div className="ch-tip" ref={tip.ref} data-on="false" role="status" aria-live="polite" />
    </div>
  );
}

/* ───────── donut ───────── */
export interface Slice { id: string; label: string; value: number; color: string }
export function DonutChart({ items, size = 200, thickness = 24, ariaLabel, valueFormat = (n) => String(n), children }: { items: Slice[]; size?: number; thickness?: number; ariaLabel: string; valueFormat?: (n: number) => string; children?: ReactNode }) {
  const [hot, setHot] = useState<string | null>(null);
  const total = items.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = (size - thickness) / 2, C = 2 * Math.PI * r, gap = items.filter((s) => s.value > 0).length > 1 ? 2.5 : 0;
  let acc = 0;
  const hs = items.find((s) => s.id === hot);
  return (
    <div className="ch-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ch-donut-track" strokeWidth={thickness} fill="none" />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total > 0 ? items.map((s, i) => {
            if (s.value <= 0) return null;
            const len = (s.value / total) * C; const off = acc; acc += len;
            return <circle key={s.id} cx={size / 2} cy={size / 2} r={r} fill="none" className="ch-seg" tabIndex={0} aria-label={`${s.label}: ${valueFormat(s.value)}`}
              style={{ stroke: s.color, strokeWidth: hot === s.id ? thickness + 4 : thickness, opacity: hot && hot !== s.id ? 0.35 : 1, ['--i' as string]: i } as CSSProperties}
              strokeDasharray={`${Math.max(len - gap, 0.1)} ${C - Math.max(len - gap, 0.1)}`} strokeDashoffset={-off}
              onPointerEnter={() => setHot(s.id)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(s.id)} onBlur={() => setHot(null)} />;
          }) : null}
        </g>
      </svg>
      <div className="ch-donut-c">
        {hs ? <><b className="t-num">{valueFormat(hs.value)}</b><span>{hs.label}</span><span className="dim">{Math.round((hs.value / (total || 1)) * 100)}%</span></> : children}
      </div>
    </div>
  );
}

/* ───────── ranked horizontal bars ───────── */
export interface HBarItem { id: string; label: ReactNode; value: number; display: string; color: string; sub?: ReactNode }
export function HBarChart({ items, max, ariaLabel }: { items: HBarItem[]; max?: number; ariaLabel: string }) {
  const m = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="ch-hbar" aria-label={ariaLabel}>
      {items.map((it, i) => (
        <li key={it.id}>
          <div className="ch-hbar-top"><span className="ch-hbar-l">{it.label}</span><b className="t-num">{it.display}</b></div>
          <div className="ch-hbar-track"><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, it.value / m))})`, background: it.color, ['--i' as string]: i } as CSSProperties} /></div>
          {it.sub ? <div className="ch-hbar-sub">{it.sub}</div> : null}
        </li>
      ))}
    </ul>
  );
}

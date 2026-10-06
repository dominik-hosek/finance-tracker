// Jednoduché SVG grafy s tooltipy a tabulkovým zobrazením.

import { h, s, showTooltip, moveTooltip, hideTooltip, cssVar } from './dom.js';
import { czk, czkCompact } from '../lib/format.js';

function niceTicks(max, count = 4) {
  if (max <= 0) return [0];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((st) => st >= raw);
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function tableView(headers, rows) {
  return h(
    'details',
    { class: 'table-view' },
    h('summary', {}, 'Zobrazit jako tabulku'),
    h('table', {}, h('thead', {}, h('tr', {}, headers.map((x) => h('th', {}, x)))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))),
  );
}

/**
 * Seskupené sloupce (např. příjmy vs. výdaje po měsících).
 * groups: [{ label, title, values: number[] }], series: [{ name, color: '--var' }]
 */
export function columnChart(groups, series, { height = 240, onSelect, selected } = {}) {
  const root = h('div', { class: 'chart' });
  const legend = h('div', { class: 'legend', style: { marginBottom: '10px' } }, series.map((se) => h('span', {}, h('i', { class: 'swatch', style: { background: `var(${se.color})` } }), se.name)));
  root.append(legend);

  const draw = () => {
    const width = Math.max(280, root.clientWidth || 600);
    const pad = { l: 56, r: 8, t: 8, b: 28 };
    const plotH = height - pad.t - pad.b;
    const max = Math.max(1, ...groups.flatMap((g) => g.values));
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];
    const y = (v) => pad.t + plotH - (v / top) * plotH;
    const band = (width - pad.l - pad.r) / Math.max(1, groups.length);
    const barW = Math.max(4, Math.min(28, (band * 0.7 - 2 * (series.length - 1)) / series.length));
    const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Sloupcový graf' });

    for (const t of ticks) {
      svg.append(s('line', { class: t === 0 ? 'baseline' : 'gridline', x1: pad.l, x2: width - pad.r, y1: y(t), y2: y(t) }));
      svg.append(s('text', { x: pad.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, czkCompact(t)));
    }
    const step = Math.ceil(groups.length / Math.floor((width - pad.l) / 56));
    groups.forEach((g, gi) => {
      const x0 = pad.l + gi * band;
      const groupW = series.length * barW + (series.length - 1) * 2;
      const gx = x0 + (band - groupW) / 2;
      const gEl = s('g', { tabindex: 0, class: g.key === selected ? 'active' : '' });
      gEl.append(s('rect', { class: 'hover-band', x: x0 + 2, y: pad.t, width: band - 4, height: plotH, rx: 6 }));
      g.values.forEach((v, si) => {
        const bh = Math.max(v > 0 ? 1 : 0, (v / top) * plotH);
        const x = gx + si * (barW + 2);
        const yTop = pad.t + plotH - bh;
        const r = Math.min(4, bh, barW / 2);
        // obdélník se zaoblenými horními rohy, ukotvený k ose
        const d = `M${x},${pad.t + plotH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${pad.t + plotH} Z`;
        gEl.append(s('path', { d, style: `fill: var(${series[si].color})` }));
      });
      if (gi % step === 0 || g.key === selected) {
        gEl.append(s('text', { x: x0 + band / 2, y: height - 8, 'text-anchor': 'middle', style: g.key === selected ? 'fill: var(--ink); font-weight: 700' : '' }, g.label));
      }
      gEl.append(s('rect', { class: 'hit', x: x0, y: pad.t, width: band, height: plotH + pad.b, style: onSelect ? 'cursor:pointer' : '' }));
      const show = (e) => {
        gEl.classList.add('active');
        showTooltip(e, g.title, g.values.map((v, si) => ({ color: cssVar(series[si].color), value: czk(v), label: series[si].name })));
      };
      gEl.addEventListener('pointerenter', show);
      gEl.addEventListener('focus', show);
      gEl.addEventListener('pointermove', moveTooltip);
      const leave = () => {
        if (g.key !== selected) gEl.classList.remove('active');
        hideTooltip();
      };
      gEl.addEventListener('pointerleave', leave);
      gEl.addEventListener('blur', leave);
      if (onSelect) {
        gEl.addEventListener('click', () => onSelect(g.key));
        gEl.addEventListener('keydown', (e) => e.key === 'Enter' && onSelect(g.key));
      }
      svg.append(gEl);
    });
    root.querySelector('svg')?.remove();
    legend.after(svg);
  };
  requestAnimationFrame(draw);
  root._redraw = draw;
  root.append(tableView(['', ...series.map((x) => x.name)], groups.map((g) => [g.title, ...g.values.map(czk)])));
  return root;
}

/**
 * Kumulativní čára po dnech. series: [{ name, color: '--var', values: (number|null)[] }]
 */
export function lineChart(series, { height = 240, xLabel = (i) => `${i + 1}.` } = {}) {
  const root = h('div', { class: 'chart' });
  const legend = h('div', { class: 'legend', style: { marginBottom: '10px' } }, series.map((se) => h('span', {}, h('i', { class: 'swatch', style: { background: `var(${se.color})`, height: '3px', width: '14px', borderRadius: '2px' } }), se.name)));
  root.append(legend);
  const n = Math.max(...series.map((x) => x.values.length));

  const draw = () => {
    const width = Math.max(280, root.clientWidth || 600);
    const pad = { l: 56, r: 12, t: 10, b: 28 };
    const plotH = height - pad.t - pad.b;
    const plotW = width - pad.l - pad.r;
    const max = Math.max(1, ...series.flatMap((x) => x.values.filter((v) => v !== null)));
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];
    const x = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
    const y = (v) => pad.t + plotH - (v / top) * plotH;
    const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Spojnicový graf' });
    for (const t of ticks) {
      svg.append(s('line', { class: t === 0 ? 'baseline' : 'gridline', x1: pad.l, x2: width - pad.r, y1: y(t), y2: y(t) }));
      svg.append(s('text', { x: pad.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, czkCompact(t)));
    }
    for (const i of [0, 6, 13, 20, n - 1]) {
      if (i < n) svg.append(s('text', { x: x(i), y: height - 8, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }, xLabel(i)));
    }
    series.forEach((se, si) => {
      const pts = se.values.map((v, i) => (v === null ? null : [x(i), y(v)])).filter(Boolean);
      if (!pts.length) return;
      svg.append(s('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), fill: 'none', style: `stroke: var(${se.color})`, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: si === 0 ? 1 : 0.85 }));
      const last = pts[pts.length - 1];
      svg.append(s('circle', { cx: last[0], cy: last[1], r: 4, style: `fill: var(${se.color}); stroke: var(--surface)`, 'stroke-width': 2 }));
    });
    const cross = s('line', { class: 'crosshair', y1: pad.t, y2: pad.t + plotH, visibility: 'hidden' });
    const dots = series.map((se) => s('circle', { r: 4, style: `fill: var(${se.color}); stroke: var(--surface)`, 'stroke-width': 2, visibility: 'hidden' }));
    svg.append(cross, ...dots);
    const hit = s('rect', { class: 'hit', x: pad.l - 10, y: 0, width: plotW + 20, height, tabindex: 0 });
    let focusIdx = n - 1;
    const at = (e, i) => {
      i = Math.max(0, Math.min(n - 1, i));
      focusIdx = i;
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      cross.setAttribute('visibility', 'visible');
      series.forEach((se, si) => {
        const v = se.values[i];
        if (v === null || v === undefined) return dots[si].setAttribute('visibility', 'hidden');
        dots[si].setAttribute('cx', x(i));
        dots[si].setAttribute('cy', y(v));
        dots[si].setAttribute('visibility', 'visible');
      });
      showTooltip(e, `${xLabel(i)} den`, series.filter((se) => se.values[i] !== null && se.values[i] !== undefined).map((se) => ({ color: cssVar(se.color), value: czk(se.values[i]), label: se.name })));
    };
    hit.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * width;
      at(e, Math.round(((px - pad.l) / plotW) * (n - 1)));
    });
    hit.addEventListener('focus', (e) => at(e, focusIdx));
    hit.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        at({ type: 'focus', currentTarget: hit }, focusIdx + (e.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    const leave = () => {
      cross.setAttribute('visibility', 'hidden');
      dots.forEach((d) => d.setAttribute('visibility', 'hidden'));
      hideTooltip();
    };
    hit.addEventListener('pointerleave', leave);
    hit.addEventListener('blur', leave);
    svg.append(hit);
    root.querySelector('svg')?.remove();
    legend.after(svg);
  };
  requestAnimationFrame(draw);
  root._redraw = draw;
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    if (series.some((se) => se.values[i] !== null && se.values[i] !== undefined)) rows.push([xLabel(i), ...series.map((se) => (se.values[i] === null || se.values[i] === undefined ? '–' : czk(se.values[i])))]);
  }
  root.append(tableView(['Den', ...series.map((x) => x.name)], rows));
  return root;
}

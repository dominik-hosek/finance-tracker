// Mini helper pro tvorbu DOM bez innerHTML (data z výpisů jsou nedůvěryhodná).

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// --- tooltip ---
const tip = () => document.getElementById('tooltip');

/** rows: [{ color, value, label }] */
export function showTooltip(evt, title, rows) {
  const t = tip();
  t.replaceChildren(
    h('div', { class: 't-title' }, title),
    ...rows.map((r) =>
      h('div', { class: 't-row' }, r.color ? h('span', { class: 'key', style: { background: r.color } }) : null, h('b', {}, r.value), h('span', { class: 'muted' }, r.label || '')),
    ),
  );
  t.hidden = false;
  moveTooltip(evt);
}

export function moveTooltip(evt) {
  const t = tip();
  let x;
  let y;
  if (evt.clientX !== undefined && evt.type !== 'focus') {
    x = evt.clientX;
    y = evt.clientY;
  } else {
    const r = evt.currentTarget.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top;
  }
  const w = t.offsetWidth;
  const left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
  const top = y - t.offsetHeight - 12 < 8 ? y + 16 : y - t.offsetHeight - 12;
  t.style.left = `${left}px`;
  t.style.top = `${top}px`;
}

export function hideTooltip() {
  tip().hidden = true;
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

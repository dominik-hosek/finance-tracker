const czkFmt = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
const czkShort = new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 });

export const czk = (n) => czkFmt.format(Math.round(n || 0)).replace(/ /g, ' ');
export const czkCompact = (n) => `${czkShort.format(n || 0).replace(/ /g, ' ')} Kč`;
export const pct = (x) => `${Math.round((x || 0) * 100)} %`;

const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
const MONTHS_SHORT = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

export const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS[mo - 1]} ${y}`;
};
export const monthShort = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS_SHORT[mo - 1]} ${String(y).slice(2)}`;
};
export const dateLabel = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return `${day}. ${m}. ${y}`;
};

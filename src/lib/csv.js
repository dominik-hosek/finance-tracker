// Robustní CSV parser: detekce kódování (UTF-8 / Windows-1250), oddělovače a uvozovek.

/** Dekóduje bajty souboru. České banky často exportují ve Windows-1250. */
export function decodeBytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try {
    let text = new TextDecoder('utf-8', { fatal: true }).decode(u8);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return text;
  } catch {
    return new TextDecoder('windows-1250').decode(u8);
  }
}

/** Odhadne oddělovač podle konzistence počtu polí na prvních řádcích. */
export function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 40);
  let best = ',';
  let bestScore = -1;
  for (const d of [';', ',', '\t', '|']) {
    const counts = lines.map((l) => splitLine(l, d).length).filter((n) => n > 1);
    if (!counts.length) continue;
    // nejčastější počet sloupců × kolik řádků ho má
    const freq = new Map();
    for (const c of counts) freq.set(c, (freq.get(c) || 0) + 1);
    const [cols, hits] = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const score = hits * Math.min(cols, 12);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function splitLine(line, d) {
  return parseCsv(line, d)[0] || [];
}

/** Parsuje CSV text do pole řádků (pole buněk). Zvládá uvozovky a nové řádky v nich. */
export function parseCsv(text, delimiter) {
  const d = delimiter ?? detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"' && cell.trim() === '') {
      inQuotes = true;
      cell = '';
    } else if (ch === d) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ''));
}

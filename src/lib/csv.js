// Robustní CSV parser: detekce kódování (UTF-8 / UTF-16 / Windows-1250), oddělovače a uvozovek.

/** Pozná UTF-16 podle BOM nebo podle nulových bajtů (ASCII znaky mají v UTF-16 druhý bajt 0). */
function utf16Encoding(u8) {
  if (u8[0] === 0xff && u8[1] === 0xfe) return 'utf-16le';
  if (u8[0] === 0xfe && u8[1] === 0xff) return 'utf-16be';
  const n = Math.min(u8.length - (u8.length % 2), 400);
  let even = 0;
  let odd = 0;
  for (let i = 0; i < n; i += 2) {
    if (u8[i] === 0) even++;
    if (u8[i + 1] === 0) odd++;
  }
  if (n && odd / (n / 2) > 0.3 && even === 0) return 'utf-16le';
  if (n && even / (n / 2) > 0.3 && odd === 0) return 'utf-16be';
  return null;
}

/**
 * Dekóduje bajty souboru. České banky exportují v UTF-8, Windows-1250
 * nebo (např. George od České spořitelny) v UTF-16.
 */
export function decodeBytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const strip = (t) => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
  const utf16 = utf16Encoding(u8);
  if (utf16) return strip(new TextDecoder(utf16).decode(u8));
  try {
    return strip(new TextDecoder('utf-8', { fatal: true }).decode(u8));
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

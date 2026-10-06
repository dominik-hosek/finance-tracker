// Převod libovolného bankovního CSV výpisu na jednotný seznam transakcí.
// Sloupce se rozpoznávají podle názvů v hlavičce (CZ i EN), takže funguje
// pro většinu bank (Česká spořitelna, ČSOB, KB, Air Bank, Fio, Raiffeisen,
// mBank, Moneta, Revolut, Wise, …) bez nutnosti nastavování.

import { decodeBytes, parseCsv } from './csv.js';
import { fold } from './text.js';

// Pořadí = priorita (stejná role se může objevit víckrát). Vzor začínající "="
// musí odpovídat celému názvu sloupce, krátké vzory (<=3 znaky) celému slovu.
const ROLE_PATTERNS = [
  ['ownerName', ['nazev uctu vlastnika', 'nazev vlastnika', 'vlastnik uctu']],
  ['ownerAccount', ['cislo uctu vlastnika', 'ucet vlastnika', 'iban vlastnika']],
  ['ignore', ['puvodni', 'mene transakce', 'original', 'zustatek', 'balance', 'kurz', 'exchange rate', 'ks', 'ss', 'konstantni symbol', 'specificky symbol', 'cislo karty', 'id pohybu', 'id transakce', 'id pokynu', 'identifikace transakce', 'nazev banky', 'skupina plateb', 'product', 'produkt', 'bic']],
  ['date', ['datum zauctovani', 'datum provedeni', 'datum transakce', 'datum platby', 'datum pohybu', 'zauctovano', 'booking date', 'completed date', 'transaction date', 'started date']],
  ['date2', ['datum splatnosti', 'datum odepsani', 'valuta']],
  ['date', ['datum', 'date']],
  ['vs', ['variabilni symbol', 'vs']],
  ['counterAccount', ['cislo protiuctu', 'protiucet', 'cislo uctu protistrany', 'ucet protistrany', 'iban protistrany', 'counterparty account']],
  ['bankCode', ['kod banky', 'bankovni kod', 'banka protiuctu']],
  ['fee', ['poplatek', 'poplatk', 'fee', 'fees']],
  ['debit', ['debet', '=vydaj', '=vydaje', 'odchozi castka', 'money out', 'paid out', 'withdrawal']],
  ['credit', ['kredit', '=prijem', '=prijmy', 'prichozi castka', 'money in', 'paid in', 'deposit']],
  ['amount', ['zauctovana castka', 'castka v mene uctu', 'castka', 'objem', 'amount', 'suma', 'hodnota']],
  ['currency', ['mena uctu', 'mena', 'currency']],
  ['counterparty', ['nazev protiuctu', 'nazev protistrany', 'nazev uctu protistrany', 'protistrana', 'nazev obchodnika', 'obchodnik', 'merchant', 'prijemce', 'platce', 'counterparty', 'payee', 'misto transakce', 'misto', 'nazev']],
  ['type', ['typ transakce', 'typ pohybu', 'typ uhrady', 'druh transakce', 'typ operace', 'typ platby', 'typ', 'type', 'druh']],
  ['direction', ['smer uhrady', 'smer platby', 'smer', 'credit/debit', 'debit/credit', 'indikator']],
  ['state', ['stav', 'state', 'status']],
  ['message', ['zprava pro prijemce', 'zprava pro mne', 'poznamka pro mne', 'zprava', 'poznamka', 'popis transakce', 'popis', 'informace', 'detail', 'description', 'reference', 'note', 'uziv. identifikace', 'identifikace', 'komentar', 'oznaceni platby']],
];

function matches(h, p) {
  if (p.startsWith('=')) return h === p.slice(1);
  if (p.length <= 3) return h === p || h.split(/[ .()/-]/).includes(p);
  return h.includes(p);
}

function roleOf(header) {
  const h = fold(header).replace(/[_"]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!h || h.length > 60) return null;
  for (const [role, patterns] of ROLE_PATTERNS) {
    if (patterns.some((p) => matches(h, p))) return role;
  }
  return null;
}

/** Najde řádek hlavičky a namapuje sloupce na role. */
export function detectColumns(rows) {
  let best = null;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const map = {};
    const extra = [];
    rows[i].forEach((cell, idx) => {
      const role = roleOf(cell);
      if (!role || role === 'ignore') return;
      if (map[role] === undefined) map[role] = idx;
      else if (role === 'message' || role === 'counterparty') extra.push(idx);
    });
    const ok = (map.date ?? map.date2) !== undefined && (map.amount !== undefined || map.debit !== undefined || map.credit !== undefined);
    if (!ok) continue;
    const score = Object.keys(map).length;
    if (!best || score > best.score) best = { headerIndex: i, map, extra, score };
  }
  return best;
}

/** "-1 234,56 Kč" → -1234.56 ; podporuje i 1,234.56 a (123) */
export function parseAmount(raw) {
  if (raw === undefined || raw === null) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[−–]/g, '-');
  if (/-\s*$/.test(s)) {
    neg = !neg;
    s = s.replace(/-\s*$/, '');
  }
  s = s.replace(/[^\d,.\-+]/g, '');
  if (s.startsWith('-')) {
    neg = !neg;
    s = s.slice(1);
  }
  s = s.replace(/^\+/, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = (s.match(/,/g).length > 1 ? s.replace(/,/g, '') : s.replace(',', '.'));
  } else if (lastDot > -1 && s.match(/\./g).length > 1) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return NaN;
  return Math.round((neg ? -n : n) * 100) / 100;
}

/** Různé formáty data → "YYYY-MM-DD". */
export function parseDate(raw) {
  const s = String(raw ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})/);
  if (m) return iso(year(+m[3]), +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    // dd/mm/yyyy; pokud první číslo > 12 není co řešit, když druhé > 12, jde o mm/dd
    let [d, mo] = [+m[1], +m[2]];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    return iso(year(+m[3]), mo, d);
  }
  return null;
}

function year(y) {
  return y < 100 ? 2000 + y : y;
}

function iso(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Krátký deterministický hash (FNV-1a) pro ID transakcí → re-import nevytvoří duplikáty. */
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + str.length.toString(36);
}

const NEGATIVE_DIRECTION = /odchozi|debet|debit|vydaj|vyber|out|^d$|^dbit$/;
const SKIP_STATE = /reverted|declined|failed|zamitnut|stornovan|cancel/;

/** Z preambule výpisu (řádky nad hlavičkou) vytáhne číslo účtu / IBAN. */
function findAccountNumber(rows, until) {
  for (let i = 0; i < until; i++) {
    const line = rows[i].join(' ');
    const iban = line.match(/\bCZ\d{2}\s?(\d{4}\s?){5}\b/);
    if (iban) return iban[0].replace(/\s/g, '');
    const acc = line.match(/\b(\d{1,6}-)?\d{2,10}\/\d{4}\b/);
    if (acc) return acc[0];
  }
  return '';
}

/**
 * Hlavní vstup: obsah souboru (text nebo bajty) → { account, transactions, skipped }.
 * @param {string|Uint8Array|ArrayBuffer} content
 * @param {string} fileName
 */
export function importStatement(content, fileName = 'ucet.csv') {
  const text = typeof content === 'string' ? content.replace(/^﻿/, '') : decodeBytes(content);
  const rows = parseCsv(text);
  const cols = detectColumns(rows);
  if (!cols) {
    throw new Error(`V souboru „${fileName}“ jsem nenašel hlavičku se sloupci datum a částka.`);
  }
  const { headerIndex, map, extra } = cols;
  // Číslo a název vlastního účtu: z preambule, nebo ze sloupců „… vlastníka“ (George).
  const firstRow = rows[headerIndex + 1] || [];
  const ownCell = (role) => (map[role] !== undefined ? (firstRow[map[role]] || '').trim() : '');
  const number = findAccountNumber(rows, headerIndex) || ownCell('ownerAccount');
  const ownerName = ownCell('ownerName');
  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const name = ownerName ? [ownerName, number].filter(Boolean).join(' · ') : baseName || number || 'Účet';
  const account = { id: hash(number || baseName), name, number };

  const get = (r, role) => (map[role] !== undefined ? r[map[role]] ?? '' : '');
  const seen = new Map();
  const transactions = [];
  let skipped = 0;

  for (const r of rows.slice(headerIndex + 1)) {
    const date = parseDate(get(r, 'date')) || parseDate(get(r, 'date2'));
    if (!date) {
      skipped++;
      continue;
    }
    if (SKIP_STATE.test(fold(get(r, 'state')))) {
      skipped++;
      continue;
    }
    let amount;
    if (map.amount !== undefined) {
      amount = parseAmount(get(r, 'amount'));
      const dir = fold(get(r, 'direction'));
      if (amount > 0 && dir && NEGATIVE_DIRECTION.test(dir)) amount = -amount;
    } else {
      const debit = Math.abs(parseAmount(get(r, 'debit')) || 0);
      const credit = Math.abs(parseAmount(get(r, 'credit')) || 0);
      amount = credit - debit;
    }
    const fee = Math.abs(parseAmount(get(r, 'fee')) || 0);
    if (fee) amount -= fee;
    if (!Number.isFinite(amount) || amount === 0) {
      skipped++;
      continue;
    }
    amount = Math.round(amount * 100) / 100;

    const counterparty = get(r, 'counterparty');
    const message = [get(r, 'message'), ...extra.map((i) => r[i] ?? '')]
      .filter((x, i, a) => x && a.indexOf(x) === i && x !== counterparty)
      .join(' · ');
    const counterAccount = [get(r, 'counterAccount'), get(r, 'bankCode')].filter(Boolean).join('/');
    const base = [account.id, date, amount, counterparty, message].join('|');
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);

    transactions.push({
      id: hash(`${base}|${n}`),
      accountId: account.id,
      date,
      amount,
      currency: (get(r, 'currency') || 'CZK').toUpperCase(),
      counterparty: counterparty || '',
      counterAccount,
      message,
      vs: get(r, 'vs'),
      type: get(r, 'type'),
    });
  }
  return { account, transactions, skipped };
}

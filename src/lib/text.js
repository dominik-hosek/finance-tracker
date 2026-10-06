// Pomocné funkce pro práci s textem z bankovních výpisů.

/** Malá písmena bez diakritiky, sjednocené mezery. */
export function fold(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Klíč obchodníka/protistrany pro seskupování opakovaných plateb.
 * Odstraní čísla karet, data, částky a šum, ponechá první 3 slova.
 */
export function merchantKey(s) {
  const words = fold(s)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/[0-9]+([.,/:-][0-9]+)*/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return words.slice(0, 3).join(' ');
}

const STOP_WORDS = new Set([
  'platba', 'kartou', 'karta', 'nakup', 'transakce', 'cz', 'czk', 'prg', 'praha',
  'brno', 'ostrava', 'www', 'com', 'sro', 'as', 'spol', 'ltd', 'inc', 'gmbh',
  'dne', 'cze', 'eur', 'usd', 'ref', 'pos', 'debit', 'card', 'payment', 'to', 'from',
  'na', 'za', 'od', 'do', 'the', 'and', 'ucet', 'uctu',
]);

// Obohacení surových transakcí: kategorie, převody mezi vlastními účty, pravidelnost.

import { autoCategory, category } from './categories.js';
import { merchantKey, fold } from './text.js';

const DAY = 86400000;

/** Klíč pro „zapamatování“ kategorie u obchodníka. */
export function ruleKey(tx) {
  return merchantKey(tx.counterparty || tx.message) || (tx.counterAccount ? `ucet ${tx.counterAccount}` : '');
}

/**
 * Najde dvojice „odchozí z účtu A → příchozí na účet B“ se stejnou částkou do 4 dnů.
 * Vrací Set ID transakcí, které jsou interním převodem.
 */
export function detectInternalTransfers(txs) {
  const result = new Set();
  const incoming = txs.filter((t) => t.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  const used = new Set();
  for (const out of txs) {
    if (out.amount >= 0) continue;
    const t0 = Date.parse(out.date);
    const match = incoming.find(
      (inc) =>
        !used.has(inc.id) &&
        inc.accountId !== out.accountId &&
        Math.abs(inc.amount + out.amount) < 0.005 &&
        Math.abs(Date.parse(inc.date) - t0) <= 4 * DAY,
    );
    if (match) {
      used.add(match.id);
      result.add(out.id).add(match.id);
    }
  }
  return result;
}

// Kategorie s proměnlivými nákupy – opakovaný nákup v Albertu není „pravidelná platba“.
const VARIABLE = new Set(['groceries', 'restaurants', 'delivery', 'transport', 'car', 'cash', 'household', 'shopping', 'entertainment', 'travel', 'health']);

const RECURRING_HINT = /trvaly prikaz|trvala platba|inkaso|\bsipo\b|standing order|direct debit|opakovana platba|predplatne|subscription|souhlas s inkasem/;

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Pravidelné platby: stejný příjemce ve ≥ 2 různých měsících s podobnou částkou
 * (±20 %), maximálně ~2× měsíčně; nebo trvalý příkaz/inkaso; nebo kategorie,
 * která je ze své podstaty fixní (nájem, energie, předplatné…).
 */
export function detectRecurring(txs) {
  const ids = new Set();
  const groups = new Map();
  for (const t of txs) {
    if (t.amount >= 0 || t.kind === 'transfer' || VARIABLE.has(t.category)) continue;
    const key = t.counterAccount && !/^\/?$/.test(t.counterAccount) ? `acc:${t.counterAccount}` : `m:${ruleKey(t)}`;
    if (key === 'm:') continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  for (const list of groups.values()) {
    const months = new Set(list.map((t) => t.date.slice(0, 7)));
    if (months.size < 2 || list.length / months.size > 2.5) continue;
    const med = median(list.map((t) => -t.amount));
    const similar = list.filter((t) => Math.abs(-t.amount - med) <= med * 0.2);
    if (similar.length / list.length >= 0.6) {
      for (const t of similar) ids.add(t.id);
    }
  }
  for (const t of txs) {
    if (t.amount >= 0 || t.kind === 'transfer') continue;
    if (RECURRING_HINT.test(fold(`${t.type} ${t.message}`)) || category(t.category).fixed) ids.add(t.id);
  }
  return ids;
}

/**
 * Hlavní funkce: z uložených dat vrátí obohacené transakce.
 * @param {object} state { transactions, overrides, userRules, recurringRules }
 */
export function enrich(state) {
  const { transactions = [], overrides = {}, userRules = {}, recurringRules = {} } = state;
  const transferIds = detectInternalTransfers(transactions);
  const txs = transactions.map((t) => {
    const key = ruleKey(t);
    let cat = overrides[t.id] || userRules[key] || (transferIds.has(t.id) ? 'transfer' : autoCategory(t));
    const c = category(cat);
    return { ...t, category: cat, kind: c.kind, ruleKey: key };
  });
  const recurring = detectRecurring(txs);
  for (const t of txs) {
    const o = t.amount < 0 ? recurringRules[t.ruleKey] : false;
    t.recurring = o === undefined ? recurring.has(t.id) : o;
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date) || a.amount - b.amount);
}

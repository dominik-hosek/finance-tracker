// Souhrny za měsíc a vývoj v čase.

import { category } from './categories.js';

const round = (n) => Math.round(n * 100) / 100;

export function listMonths(txs) {
  return [...new Set(txs.map((t) => t.date.slice(0, 7)))].sort().reverse();
}

export function inMonth(txs, month) {
  return txs.filter((t) => t.date.startsWith(month));
}

export function previousMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Kompletní souhrn jednoho měsíce. */
export function summarize(txs, month) {
  const list = inMonth(txs, month).filter((t) => t.kind !== 'transfer');
  const cat = new Map();
  const acc = new Map();
  let income = 0;
  let expenses = 0;
  let saved = 0;
  let recurring = 0;
  const groups = { needs: 0, wants: 0 };
  const days = daysInMonth(month);
  const daily = new Array(days).fill(0);

  for (const t of list) {
    const c = category(t.category);
    const entry = cat.get(c.id) || { id: c.id, total: 0, count: 0, recurring: 0 };
    entry.total += t.amount;
    entry.count++;
    cat.set(c.id, entry);

    const a = acc.get(t.accountId) || { accountId: t.accountId, income: 0, expenses: 0 };
    if (t.amount > 0) a.income += t.amount;
    else a.expenses -= t.amount;
    acc.set(t.accountId, a);

    if (c.kind === 'income') income += t.amount;
    else if (c.kind === 'saving') saved -= t.amount;
    else if (c.kind === 'expense') {
      expenses -= t.amount;
      if (t.recurring) {
        recurring -= t.amount;
        entry.recurring -= t.amount;
      }
      if (c.group) groups[c.group] -= t.amount;
      const d = Math.min(days, Number(t.date.slice(8, 10))) - 1;
      daily[d] -= t.amount;
    }
  }

  let run = 0;
  const cumulative = daily.map((v) => round((run += v)));
  const byCategory = [...cat.values()]
    .map((e) => ({ ...e, total: round(e.total), recurring: round(e.recurring) }))
    .filter((e) => category(e.id).kind === 'expense' && e.total < 0)
    .map((e) => ({ ...e, total: -e.total }))
    .sort((a, b) => b.total - a.total);
  const incomeByCategory = [...cat.values()]
    .filter((e) => category(e.id).kind === 'income' && e.total > 0)
    .map((e) => ({ ...e, total: round(e.total) }))
    .sort((a, b) => b.total - a.total);

  const net = income - expenses;
  return {
    month,
    count: list.length,
    income: round(income),
    expenses: round(expenses),
    saved: round(saved),
    net: round(net),
    savingsRate: income > 0 ? net / income : null,
    recurring: round(recurring),
    irregular: round(expenses - recurring),
    groups: { needs: round(groups.needs), wants: round(groups.wants), savings: round(Math.max(0, net)) },
    byCategory,
    incomeByCategory,
    byAccount: [...acc.values()],
    cumulative,
  };
}

/** Příjmy a výdaje po měsících (nejstarší → nejnovější). */
export function trend(txs, upTo, count = 12) {
  return listMonths(txs)
    .filter((m) => m <= upTo)
    .slice(0, count)
    .reverse()
    .map((m) => {
      const s = summarize(txs, m);
      return { month: m, income: s.income, expenses: s.expenses, net: s.net, saved: s.saved };
    });
}

/**
 * Přehled pravidelných závazků (seskupeno podle obchodníka) z posledních 3 měsíců
 * do vybraného měsíce včetně. monthly = typická měsíční částka.
 */
export function recurringCommitments(txs, month) {
  const months = new Set([month, previousMonth(month), previousMonth(previousMonth(month))]);
  const groups = new Map();
  for (const t of txs) {
    if (!t.recurring || t.amount >= 0 || t.kind === 'transfer' || !months.has(t.date.slice(0, 7))) continue;
    const key = t.ruleKey || t.counterparty || t.message;
    const g = groups.get(key) || { key, label: t.counterparty || t.message || key, category: t.category, perMonth: new Map(), last: t };
    const m = t.date.slice(0, 7);
    g.perMonth.set(m, (g.perMonth.get(m) || 0) - t.amount);
    if (t.date > g.last.date) g.last = t;
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => {
      const vals = [...g.perMonth.values()].sort((a, b) => a - b);
      return {
        key: g.key,
        label: g.label,
        category: g.category,
        monthly: round(vals[vals.length >> 1]),
        inThisMonth: round(g.perMonth.get(month) || 0),
        lastDate: g.last.date,
        months: g.perMonth.size,
      };
    })
    .sort((a, b) => b.monthly - a.monthly);
}

/** Průměr kategorie za předchozí měsíce (max 3), pro porovnání. */
export function categoryAverages(txs, month, count = 3) {
  const prev = listMonths(txs).filter((m) => m < month).slice(0, count);
  const sums = new Map();
  for (const m of prev) {
    for (const c of summarize(txs, m).byCategory) sums.set(c.id, (sums.get(c.id) || 0) + c.total);
  }
  const avg = new Map();
  for (const [id, total] of sums) avg.set(id, round(total / prev.length));
  return { months: prev.length, avg };
}

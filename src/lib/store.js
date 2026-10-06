// Uložení dat v prohlížeči (localStorage). Nic se neodesílá na žádný server.

import { DEFAULT_SETTINGS } from './insights.js';

const KEY = 'finance-tracker:v1';

export function emptyState() {
  return {
    accounts: {},
    transactions: [],
    overrides: {}, // txId → kategorie
    userRules: {}, // klíč obchodníka → kategorie
    recurringRules: {}, // klíč obchodníka → true/false
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const data = JSON.parse(raw);
    return { ...emptyState(), ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } };
  } catch {
    return emptyState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Přidá importovaný výpis; vrací počet nových transakcí (duplicity přeskočí). */
export function addStatement(state, { account, transactions }) {
  const existing = state.accounts[account.id];
  state.accounts[account.id] = existing ? { ...account, name: existing.name } : account;
  const ids = new Set(state.transactions.map((t) => t.id));
  let added = 0;
  for (const t of transactions) {
    if (ids.has(t.id)) continue;
    state.transactions.push(t);
    ids.add(t.id);
    added++;
  }
  return added;
}

export function removeAccount(state, accountId) {
  delete state.accounts[accountId];
  state.transactions = state.transactions.filter((t) => t.accountId !== accountId);
}

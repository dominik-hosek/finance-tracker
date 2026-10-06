import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importStatement, parseAmount, parseDate } from '../src/lib/importer.js';
import { autoCategory } from '../src/lib/categories.js';
import { enrich } from '../src/lib/pipeline.js';
import { summarize, recurringCommitments } from '../src/lib/analysis.js';
import { generateInsights } from '../src/lib/insights.js';

const sample = (f) => readFileSync(new URL(`../public/samples/${f}`, import.meta.url));

function loadAll() {
  const transactions = [];
  for (const f of ['bezny-ucet.csv', 'air-bank.csv', 'revolut.csv']) {
    transactions.push(...importStatement(new Uint8Array(sample(f)), f).transactions);
  }
  return enrich({ transactions });
}

test('parseAmount zvládá české i anglické formáty', () => {
  assert.equal(parseAmount('-1 234,56'), -1234.56);
  assert.equal(parseAmount('1 234,5 Kč'), 1234.5);
  assert.equal(parseAmount('-1,234.56'), -1234.56);
  assert.equal(parseAmount('1.234.567'), 1234567);
  assert.equal(parseAmount('−89,00'), -89);
  assert.equal(parseAmount('250-'), -250);
  assert.equal(parseAmount('(99.90)'), -99.9);
  assert.ok(Number.isNaN(parseAmount('')));
});

test('parseDate', () => {
  assert.equal(parseDate('05.07.2026'), '2026-07-05');
  assert.equal(parseDate('5. 7. 2026'), '2026-07-05');
  assert.equal(parseDate('2026-07-05 12:00:00'), '2026-07-05');
  assert.equal(parseDate('31/12/26'), '2026-12-31');
  assert.equal(parseDate('nesmysl'), null);
});

test('import tří různých formátů včetně Windows-1250', () => {
  const a = importStatement(new Uint8Array(sample('bezny-ucet.csv')), 'bezny-ucet.csv');
  assert.equal(a.account.number, '1234567890/0800');
  assert.equal(a.transactions.length, 29);
  assert.ok(a.transactions.some((t) => t.counterparty === 'Pražská energetika' && t.amount === -2850));

  const b = importStatement(new Uint8Array(sample('air-bank.csv')), 'air-bank.csv');
  assert.equal(b.transactions.length, 35);
  assert.ok(b.transactions.every((t) => t.counterparty), 'diakritika dekódovaná');
  const albert = b.transactions.find((t) => /KAUFLAND/.test(t.counterparty));
  assert.ok(albert.amount < 0, 'směr „Odchozí“ → záporná částka');
  assert.ok(b.transactions.some((t) => t.amount === 8000));

  const c = importStatement(sample('revolut.csv').toString(), 'revolut.csv');
  assert.equal(c.transactions.length, 92);
  assert.ok(c.transactions.find((t) => t.message === 'Netflix').amount === -299);
});

test('re-import stejného souboru dává stejná ID (žádné duplicity)', () => {
  const x = importStatement(sample('revolut.csv').toString(), 'revolut.csv').transactions.map((t) => t.id);
  const y = importStatement(sample('revolut.csv').toString(), 'revolut.csv').transactions.map((t) => t.id);
  assert.deepEqual(x, y);
  assert.equal(new Set(x).size, x.length);
});

test('kategorizace typických českých plateb', () => {
  const c = (counterparty, amount = -100, message = '') => autoCategory({ counterparty, amount, message, type: '' });
  assert.equal(c('ALBERT 1234 PRAHA'), 'groceries');
  assert.equal(c('Bolt Food'), 'delivery');
  assert.equal(c('Bolt'), 'transport');
  assert.equal(c('Netflix'), 'subscriptions');
  assert.equal(c('ČEZ Prodej'), 'utilities');
  assert.equal(c('Dr. Max lékárna'), 'health');
  assert.equal(c('ACME s.r.o.', 50000, 'Mzda 07/2026'), 'salary');
  assert.equal(c('ALZA.CZ', 1990), 'refund');
  assert.equal(c('Portu'), 'savings');
  assert.equal(c('Neznámý obchod'), 'other');
});

test('převody mezi vlastními účty se nepočítají do výdajů', () => {
  const txs = loadAll();
  const transfers = txs.filter((t) => t.category === 'transfer');
  assert.equal(transfers.length, 12); // 2 páry × 3 měsíce
  const s = summarize(txs, '2026-09');
  assert.equal(s.income, 61200);
  assert.ok(s.expenses > 40000 && s.expenses < 60000, `výdaje ${s.expenses}`);
});

test('pravidelné vs. nepravidelné', () => {
  const txs = loadAll();
  const rec = recurringCommitments(txs, '2026-09').map((c) => c.label);
  for (const name of ['Jan Novák', 'Pražská energetika', 'Netflix', 'Spotify', 'Form Factory']) {
    assert.ok(rec.includes(name), `${name} má být pravidelná`);
  }
  assert.ok(!txs.find((t) => /Zara/.test(t.counterparty)).recurring);
  const s = summarize(txs, '2026-09');
  assert.ok(s.recurring > 20000 && s.recurring < 30000 && s.irregular > 15000);
});

test('tipy obsahují předplatné, rozvoz a poplatky', () => {
  const txs = loadAll();
  const ids = generateInsights(txs, '2026-09').map((i) => i.id);
  for (const id of ['subs', 'delivery', 'fees', 'small']) assert.ok(ids.includes(id), `chybí tip ${id}; mám ${ids}`);
});

test('export z George (Česká spořitelna) v UTF-16 se sloupci vlastníka', () => {
  const csv = [
    '"Název účtu vlastníka","Číslo účtu vlastníka","Datum zaúčtování","Název protiúčtu","IBAN","BIC","Protiúčet","Bankovní kód protiúčtu","Částka","Měna"',
    '"Osobní účet","1234567890/0800","05.09.2026","Lidl dekuje za nakup","","","","","-412,50","CZK"',
    '"Osobní účet","1234567890/0800","06.09.2026","PETRA NOVÁKOVÁ","","","2000123456","2010","1 500,00","CZK"',
  ].join('\r\n');
  const bytes = new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(csv, 'utf16le')]));
  const { account, transactions } = importStatement(bytes, 'export.csv');
  assert.equal(account.number, '1234567890/0800');
  assert.equal(account.name, 'Osobní účet · 1234567890/0800');
  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].counterparty, 'Lidl dekuje za nakup');
  assert.equal(transactions[0].amount, -412.5);
  assert.equal(transactions[1].counterAccount, '2000123456/2010');
  const txs = enrich({ transactions });
  assert.equal(txs.find((t) => t.amount === -412.5).category, 'groceries');
  assert.equal(txs.find((t) => t.amount === 1500).category, 'people_in');
});

test('rozpoznání plateb lidem vs. obchodům', async () => {
  const { looksLikePerson } = await import('../src/lib/categories.js');
  for (const n of ['BARBORA KAŠPAROVÁ', 'Novák, Jan', 'misa rehak']) assert.ok(looksLikePerson(n), n);
  for (const n of ['ISP HRADEC KRALOVE AS', 'Lidl dekuje za nakup', 'Qerko *Qerko', 'Google One', 'Neznámý obchod', 'R-Sa, Spol. S R.O.']) assert.ok(!looksLikePerson(n), n);
});

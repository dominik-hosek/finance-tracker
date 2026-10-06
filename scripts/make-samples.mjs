// Vygeneruje ukázkové výpisy ve formátech tří různých bank (3 měsíce)
// do public/samples/. Data jsou smyšlená a deterministická.
import { writeFileSync, mkdirSync } from 'node:fs';

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;

const MONTHS = ['2026-07', '2026-08', '2026-09'];
const day = (m, d) => `${m}-${String(d).padStart(2, '0')}`;
const cz = (iso) => iso.split('-').reverse().join('.');
const czNum = (n) => n.toFixed(2).replace('.', ',');

// --- Běžný účet (formát podobný České spořitelně / George, UTF-8, čárky) ---
const main = [];
// --- Air Bank (středníky, Windows-1250, směr úhrady) ---
const air = [];
// --- Revolut (anglický export) ---
const rev = [];

for (const [i, m] of MONTHS.entries()) {
  main.push([day(m, 10), 61200, 'ACME Software s.r.o.', '2001234567/2010', 'Mzda ' + m, 'Příchozí platba']);
  main.push([day(m, 1), -18500, 'Jan Novák', '123456789/0100', 'Nájem byt Vinohrady', 'Trvalý příkaz']);
  main.push([day(m, 15), -2850, 'Pražská energetika', '', 'Záloha elektřina', 'Inkaso']);
  main.push([day(m, 20), -1200, 'Pražská plynárenská', '', 'Záloha plyn', 'Inkaso']);
  main.push([day(m, 5), -649, 'O2 Czech Republic', '', 'Mobil + internet', 'Inkaso']);
  main.push([day(m, 18), -1350, 'Kooperativa pojišťovna', '', 'Pojištění domácnosti a odpovědnosti', 'Trvalý příkaz']);
  main.push([day(m, 28), -89, '', '', 'Poplatek za vedení účtu', 'Poplatek']);
  main.push([day(m, 11), -6000, 'Revolut', '', 'Top-up Revolut', 'Odchozí platba']);
  main.push([day(m, 11), -8000, 'Air Bank', '1122334455/3030', 'Převod mezi vlastními účty', 'Odchozí platba']);
  if (i === 1) main.push([day(m, 22), -4200, 'Dr. Max lékárna', '', 'Platba kartou', 'Platba kartou']);
  if (i === 2) main.push([day(m, 3), -3000, 'Bankomat Václavské nám.', '', 'Výběr z bankomatu', 'Výběr hotovosti']);

  air.push([day(m, 12), 8000, 'Převod mezi vlastními účty', 'Jana Nováková', '9988776655/0800']);
  for (let k = 0; k < 7; k++) air.push([day(m, 2 + k * 4), -between(450, 1650), 'Platba kartou', pick(['ALBERT 1234 PRAHA', 'LIDL DEKUJEME ZA NAKUP', 'KAUFLAND PRAHA 5', 'Rohlik.cz', 'BILLA SPOL. S R.O.']), '']);
  air.push([day(m, 8), -between(300, 700), 'Platba kartou', 'DM DROGERIE MARKT', '']);
  air.push([day(m, 14), -1490, 'Platba kartou', 'Shell Praha Chodov', '']);
  air.push([day(m, 25), -1990, 'Platba kartou', 'ALZA.CZ', '']);
  if (i === 2) air.push([day(m, 26), -5490, 'Platba kartou', 'Zara Praha Palladium', '']);
  if (i === 0) air.push([day(m, 19), 1990, 'Příchozí úhrada', 'ALZA.CZ vrácení platby', '']);

  rev.push([day(m, 11), 6000, 'TOPUP', 'Top-Up by *1234']);
  rev.push([day(m, 3), -299, 'CARD_PAYMENT', 'Netflix']);
  rev.push([day(m, 3), -199, 'CARD_PAYMENT', 'Spotify']);
  rev.push([day(m, 7), -259, 'CARD_PAYMENT', 'HBO Max']);
  rev.push([day(m, 9), -79, 'CARD_PAYMENT', 'Apple.com/bill']);
  rev.push([day(m, 1), -790, 'CARD_PAYMENT', 'Form Factory']);
  const deliveries = 3 + Math.floor(rnd() * 3) + i;
  for (let k = 0; k < deliveries; k++) rev.push([day(m, 3 + k * 5), -between(260, 520), 'CARD_PAYMENT', pick(['Wolt', 'Foodora', 'Bolt Food'])]);
  for (let k = 0; k < 9 + i * 3; k++) rev.push([day(m, 1 + ((k * 3) % 27)), -between(59, 145), 'CARD_PAYMENT', pick(['Starbucks', 'Costa Coffee', 'Kavárna Místo', 'Paul Bakery', 'Zabka'])]);
  for (let k = 0; k < 4; k++) rev.push([day(m, 6 + k * 6), -between(280, 890), 'CARD_PAYMENT', pick(['Lokál Dlouhááá', 'Bistro Proti proudu', 'Pizza Nuova', 'Sushi Bar'])]);
  for (let k = 0; k < 3; k++) rev.push([day(m, 4 + k * 8), -between(29, 160), 'CARD_PAYMENT', pick(['Bolt', 'Uber', 'DPP Litacka'])]);
  if (i === 1) rev.push([day(m, 15), -6890, 'CARD_PAYMENT', 'Booking.com Hotel Lisboa']);
  if (i === 1) rev.push([day(m, 14), -3420, 'CARD_PAYMENT', 'Ryanair']);
  if (i === 2) rev.push([day(m, 21), -890, 'CARD_PAYMENT', 'GoOut Lucerna Music Bar']);
}

mkdirSync('public/samples', { recursive: true });

// George-like CSV
const mainCsv = [
  'Výpis z účtu 1234567890/0800 – Běžný účet',
  '',
  'Datum zaúčtování,Částka,Měna,Název protiúčtu,Číslo protiúčtu,Zpráva pro příjemce,Typ transakce',
  ...main
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((r) => [cz(r[0]), `"${czNum(r[1])}"`, 'CZK', r[2], r[3], r[4], r[5]].join(',')),
].join('\r\n');
writeFileSync('public/samples/bezny-ucet.csv', '﻿' + mainCsv);

// Air Bank CSV ve Windows-1250
const airCsv = [
  'Datum provedení;Směr úhrady;Typ úhrady;Měna účtu;Částka v měně účtu;Název protistrany;Číslo účtu protistrany',
  ...air
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((r) => [cz(r[0]), r[1] < 0 ? 'Odchozí' : 'Příchozí', r[2], 'CZK', czNum(Math.abs(r[1])), r[3], r[4]].join(';')),
].join('\r\n');
writeFileSync('public/samples/air-bank.csv', encode1250(airCsv));

// Revolut CSV
const revCsv = [
  'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
  ...rev
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((r) => [r[2], 'Current', `${r[0]} 12:00:00`, `${r[0]} 12:01:00`, r[3], r[1].toFixed(2), '0.00', 'CZK', 'COMPLETED', ''].join(',')),
].join('\n');
writeFileSync('public/samples/revolut.csv', revCsv);

console.log(`Hotovo: ${main.length} + ${air.length} + ${rev.length} transakcí v public/samples/`);

function encode1250(str) {
  const map = { 'á': 0xe1, 'č': 0xe8, 'ď': 0xef, 'é': 0xe9, 'ě': 0xec, 'í': 0xed, 'ň': 0xf2, 'ó': 0xf3, 'ř': 0xf8, 'š': 0x9a, 'ť': 0x9d, 'ú': 0xfa, 'ů': 0xf9, 'ý': 0xfd, 'ž': 0x9e,
    'Á': 0xc1, 'Č': 0xc8, 'Ď': 0xcf, 'É': 0xc9, 'Ě': 0xcc, 'Í': 0xcd, 'Ň': 0xd2, 'Ó': 0xd3, 'Ř': 0xd8, 'Š': 0x8a, 'Ť': 0x8d, 'Ú': 0xda, 'Ů': 0xd9, 'Ý': 0xdd, 'Ž': 0x8e };
  return Buffer.from([...str].map((ch) => map[ch] ?? (ch.charCodeAt(0) < 128 ? ch.charCodeAt(0) : 0x3f)));
}

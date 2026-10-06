// Tipy: kde ušetřit a z čeho by se dalo víc vydělat.
// Vše jsou orientační odhady z tvých dat, ne finanční poradenství.

import { summarize, recurringCommitments, categoryAverages, inMonth, listMonths } from './analysis.js';
import { category } from './categories.js';
import { czk, pct } from './format.js';

export const DEFAULT_SETTINGS = {
  savingsRate: 3.5, // % p.a. na spořicím účtu
  investReturn: 5, // % p.a. – ilustrativní dlouhodobý výnos
};

const STREAMING = /netflix|hbo|max|disney|voyo|oneplay|skyshowtime|prime video|amazon prime|apple tv|youtube/;

/**
 * @returns {Array<{id,type,icon,title,text,impact?,items?}>}
 *   type: save | earn | warn | good ; impact = odhad Kč za rok
 */
export function generateInsights(txs, month, settings = DEFAULT_SETTINGS) {
  const s = summarize(txs, month);
  const out = [];
  if (!s.count) return out;
  const cat = (id) => s.byCategory.find((c) => c.id === id)?.total || 0;
  const monthTx = inMonth(txs, month);
  const commitments = recurringCommitments(txs, month);

  // 1) Míra úspor
  if (s.income > 0) {
    if (s.net < 0) {
      out.push({ id: 'negative', type: 'warn', icon: 'warning', title: 'Tento měsíc jsi utratil(a) víc, než přišlo',
        text: `Výdaje převýšily příjmy o ${czk(-s.net)}. Pokud se to opakuje, začni u největších nepravidelných kategorií níže.` });
    } else if (s.savingsRate < 0.1) {
      out.push({ id: 'rate-low', type: 'warn', icon: 'warning', title: `Odkládáš jen ${pct(s.savingsRate)} příjmů`,
        text: `Doporučuje se aspoň 10–20 %. Kdybys ušetřil(a) 10 %, bylo by to ${czk(s.income * 0.1)} měsíčně – ${czk(s.income * 1.2)} za rok.` });
    } else {
      out.push({ id: 'rate-ok', type: 'good', icon: 'growth', title: `Skvělé – ušetřil(a) jsi ${pct(s.savingsRate)} příjmů`,
        text: s.savingsRate >= 0.2 ? 'Jsi nad doporučenými 20 %. Teď je důležité, aby ušetřené peníze pracovaly (viz tipy níže).' : 'Jsi v doporučeném pásmu 10–20 %. Zkus se posunout ke 20 %.' });
    }
  }

  // 2) Předplatné
  const subs = commitments.filter((c) => c.category === 'subscriptions');
  if (subs.length) {
    const monthly = subs.reduce((a, c) => a + c.monthly, 0);
    const streaming = subs.filter((c) => STREAMING.test(c.label.toLowerCase()));
    out.push({ id: 'subs', type: 'save', icon: 'subscriptions',
      title: `${subs.length}× předplatné za ${czk(monthly)} měsíčně`,
      text: streaming.length >= 2
        ? `Máš ${streaming.length} streamovací služby současně. Zkus je střídat – měsíc jednu, měsíc druhou. Projdi i ostatní, co reálně nepoužíváš.`
        : 'Za rok to dělá ' + czk(monthly * 12) + '. Projdi seznam a zruš, co jsi poslední měsíc nepoužil(a).',
      items: subs.map((c) => `${c.label} – ${czk(c.monthly)}`),
      impact: Math.round(streaming.length >= 2 ? (streaming.slice(1).reduce((a, c) => a + c.monthly, 0)) * 12 : monthly * 12 * 0.25) });
  }

  // 3) Jídlo venku a rozvoz
  const delivery = cat('delivery');
  const eatOut = cat('restaurants');
  if (delivery > 800) {
    out.push({ id: 'delivery', type: 'save', icon: 'food', title: `Rozvoz jídla: ${czk(delivery)} za měsíc`,
      text: 'Rozvoz bývá o 30–50 % dražší než stejné jídlo v restauraci a 3–4× dražší než vaření doma. Polovina objednávek nahrazená vařením ušetří zhruba tolik:',
      impact: Math.round(delivery * 0.5 * 12) });
  }
  if (eatOut > 3000 && eatOut > s.expenses * 0.08) {
    out.push({ id: 'eatout', type: 'save', icon: 'food', title: `Restaurace a kavárny: ${czk(eatOut)} (${pct(eatOut / s.expenses)} výdajů)`,
      text: 'Obědové menu nahrazené 2–3× týdně krabičkou z domova a kafe z termosky je nejjednodušší úspora bez velkého odříkání.',
      impact: Math.round(eatOut * 0.3 * 12) });
  }

  // 4) Bankovní poplatky
  const fees = cat('fees');
  if (fees > 0) {
    out.push({ id: 'fees', type: 'save', icon: 'bank', title: `Bankovní poplatky: ${czk(fees)} za měsíc`,
      text: 'Většina českých bank dnes nabízí vedení účtu i výběry zdarma (často při splnění jednoduché podmínky). Přejít je otázka jednoho formuláře – o převod se postará nová banka.',
      impact: Math.round(fees * 12) });
  }

  // 5) Drobné nákupy
  const small = monthTx.filter((t) => t.kind === 'expense' && !t.recurring && t.amount < 0 && t.amount > -250);
  const smallTotal = -small.reduce((a, t) => a + t.amount, 0);
  if (small.length >= 15) {
    out.push({ id: 'small', type: 'save', icon: 'coins', title: `${small.length} drobných nákupů do 250 Kč = ${czk(smallTotal)}`,
      text: 'Malé částky nebolí, ale sčítají se. Zkus si na ně nastavit týdenní limit nebo je platit z jedné „kapesné“ karty.',
      impact: Math.round(smallTotal * 0.3 * 12) });
  }

  // 6) Energie, telefon, pojištění – srovnání nabídek
  const bills = cat('utilities') + cat('telecom') + cat('insurance');
  if (bills > 1500) {
    out.push({ id: 'bills', type: 'save', icon: 'bills', title: `Energie, tarify a pojištění: ${czk(bills)} měsíčně`,
      text: 'Jednou ročně porovnej nabídky na srovnávači (energie, mobil, internet, povinné ručení). Přechod nebo jen telefonát se starým dodavatelem obvykle srazí cenu o 10–20 %.',
      impact: Math.round(bills * 0.12 * 12) });
  }

  // 7) Hotovost
  const cash = cat('cash');
  if (cash > 4000 || (s.expenses && cash / s.expenses > 0.15)) {
    out.push({ id: 'cash', type: 'warn', icon: 'warning', title: `Vybral(a) jsi ${czk(cash)} v hotovosti`,
      text: 'Za co hotovost utratíš, tracker nevidí – a co není vidět, to se špatně hlídá. Zkus víc platit kartou, nebo si hotovostní útraty zapisuj.' });
  }

  // 8) Skoky v kategoriích proti průměru
  const { months: prevCount, avg } = categoryAverages(txs, month);
  if (prevCount) {
    const spikes = s.byCategory
      .map((c) => ({ ...c, avg: avg.get(c.id) || 0 }))
      .filter((c) => c.total - c.avg > 1500 && c.total > c.avg * 1.3 && !category(c.id).fixed)
      .sort((a, b) => b.total - b.avg - (a.total - a.avg))
      .slice(0, 3);
    if (spikes.length) {
      out.push({ id: 'spikes', type: 'warn', icon: 'trend', title: 'Kategorie, které tento měsíc vyskočily',
        text: `Proti průměru za ${prevCount === 1 ? 'předchozí měsíc' : `předchozí ${prevCount} měsíce`}:`,
        items: spikes.map((c) => `${category(c.id).emoji} ${category(c.id).label}: ${czk(c.total)} (průměr ${czk(c.avg)}, +${czk(c.total - c.avg)})`) });
    }
  }

  // 9) Vysoké fixní náklady
  if (s.income > 0 && s.recurring / s.income > 0.6) {
    out.push({ id: 'fixed', type: 'warn', icon: 'warning', title: `Pravidelné platby berou ${pct(s.recurring / s.income)} příjmů`,
      text: 'Při vysokých fixních nákladech tě rozhodí každý výpadek příjmu. Největší položky bývají bydlení, úvěry a pojištění – i malé zlevnění se tu násobí každý měsíc.' });
  }

  // ---- Z čeho víc vydělat ----
  const cashLeft = s.net - s.saved; // co zůstalo ležet na účtech
  const rate = settings.savingsRate / 100;
  if (cashLeft > 2000) {
    out.push({ id: 'idle', type: 'earn', icon: 'growth', title: `${czk(cashLeft)} ti zůstalo ležet na účtu`,
      text: `Přesuň přebytek hned po výplatě na spořicí účet. Při ${settings.savingsRate.toLocaleString('cs-CZ')} % p.a. a stejném přebytku každý měsíc to za rok vynese přibližně:`,
      impact: Math.round(cashLeft * 12 * rate * 0.5) });
  }

  const allMonths = listMonths(txs);
  const hasInterest = txs.some((t) => t.category === 'interest');
  if (!hasInterest && allMonths.length) {
    out.push({ id: 'no-interest', type: 'earn', icon: 'bank', title: 'Ve výpisech nevidím žádné připsané úroky',
      text: 'Rezervu (ideálně 3–6 měsíčních výdajů) drž na spořicím účtu nebo v termínovaném vkladu, ne na běžném účtu bez úroku.',
      items: [`Doporučená rezerva: ${czk(s.expenses * 3)} – ${czk(s.expenses * 6)}`] });
  }

  const recentSaved = allMonths.filter((m) => m <= month).slice(0, 3).some((m) => summarize(txs, m).saved > 0);
  if (!recentSaved && s.net > 0) {
    const monthly = Math.round((s.net * 0.5) / 100) * 100;
    const r = settings.investReturn / 100 / 12;
    const fv = monthly * ((Math.pow(1 + r, 120) - 1) / r);
    out.push({ id: 'invest', type: 'earn', icon: 'growth', title: 'Peníze zatím neinvestuješ',
      text: `Kdybys polovinu přebytku (${czk(monthly)}/měsíc) pravidelně investoval(a) do široce rozloženého ETF, při ilustrativním výnosu ${settings.investReturn} % p.a. by to za 10 let mohlo být ${czk(fv)} (vloženo ${czk(monthly * 120)}). Výnos není zaručený a hodnota může kolísat.` });
  }

  const cardSpend = ['groceries', 'shopping', 'restaurants', 'household', 'car', 'entertainment', 'travel'].reduce((a, id) => a + cat(id), 0);
  if (cardSpend > 8000) {
    out.push({ id: 'cashback', type: 'earn', icon: 'coins', title: 'Nech si za nákupy platit zpátky',
      text: `Kartou utrácíš asi ${czk(cardSpend)} měsíčně. Cashbackový program banky nebo cashbackový portál při nákupech na e-shopech vrátí běžně 0,5–2 %. Při 1 % je to ročně:`,
      impact: Math.round(cardSpend * 0.01 * 12) });
  }

  const salaryShare = s.income ? (s.incomeByCategory.find((c) => c.id === 'salary')?.total || 0) / s.income : 0;
  if (salaryShare > 0.9) {
    out.push({ id: 'income-ideas', type: 'earn', icon: 'idea', title: 'Celý příjem stojí na jedné výplatě',
      text: 'Pár nápadů, jak přidat další zdroj příjmů:',
      items: [
        'Prodej nepoužívaných věcí (Vinted, Bazoš, Aukro) – oblečení, elektronika, sport.',
        'Požádej o zvýšení platu – podklad: jak se změnil tvůj přínos za poslední rok.',
        'Přivýdělek z toho, co umíš (doučování, překlady, freelance projekty).',
        'Úroky a výnosy z rezervy a investic – viz tipy výše.',
      ] });
  }

  const order = { warn: 0, save: 1, earn: 2, good: 3 };
  return out.sort((a, b) => order[a.type] - order[b.type] || (b.impact || 0) - (a.impact || 0));
}

/** Celkový potenciál úspor / výdělku za rok. */
export function potential(insights) {
  return {
    save: insights.filter((i) => i.type === 'save').reduce((a, i) => a + (i.impact || 0), 0),
    earn: insights.filter((i) => i.type === 'earn').reduce((a, i) => a + (i.impact || 0), 0),
  };
}

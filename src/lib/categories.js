// Kategorie a pravidla pro automatické rozřazení transakcí.
// kind: income | expense | saving | transfer
// group (pravidlo 50/30/20): needs = nutné, wants = radosti, savings = spoření
// fixed: výdaje, které jsou typicky pravidelné (nájem, energie, předplatné…)

export const CATEGORIES = [
  { id: 'salary', label: 'Mzda a odměny', emoji: '💼', kind: 'income' },
  { id: 'interest', label: 'Úroky a dividendy', emoji: '🌱', kind: 'income' },
  { id: 'refund', label: 'Vratky a cashback', emoji: '↩️', kind: 'income' },
  { id: 'people_in', label: 'Od lidí', emoji: '🤝', kind: 'income' },
  { id: 'income_other', label: 'Ostatní příjmy', emoji: '💰', kind: 'income' },

  { id: 'housing', label: 'Bydlení', emoji: '🏠', kind: 'expense', group: 'needs', fixed: true },
  { id: 'utilities', label: 'Energie a voda', emoji: '💡', kind: 'expense', group: 'needs', fixed: true },
  { id: 'telecom', label: 'Telefon a internet', emoji: '📶', kind: 'expense', group: 'needs', fixed: true },
  { id: 'groceries', label: 'Potraviny', emoji: '🛒', kind: 'expense', group: 'needs' },
  { id: 'household', label: 'Drogerie a domácnost', emoji: '🧴', kind: 'expense', group: 'needs' },
  { id: 'transport', label: 'Doprava', emoji: '🚇', kind: 'expense', group: 'needs' },
  { id: 'car', label: 'Auto a palivo', emoji: '⛽', kind: 'expense', group: 'needs' },
  { id: 'health', label: 'Zdraví a lékárna', emoji: '💊', kind: 'expense', group: 'needs' },
  { id: 'insurance', label: 'Pojištění', emoji: '🛡️', kind: 'expense', group: 'needs', fixed: true },
  { id: 'loans', label: 'Splátky a úvěry', emoji: '🏦', kind: 'expense', group: 'needs', fixed: true },
  { id: 'kids', label: 'Děti', emoji: '🧸', kind: 'expense', group: 'needs' },
  { id: 'education', label: 'Vzdělávání', emoji: '📚', kind: 'expense', group: 'needs' },
  { id: 'taxes', label: 'Daně a úřady', emoji: '🏛️', kind: 'expense', group: 'needs' },

  { id: 'restaurants', label: 'Restaurace a kavárny', emoji: '☕', kind: 'expense', group: 'wants' },
  { id: 'delivery', label: 'Rozvoz jídla', emoji: '🛵', kind: 'expense', group: 'wants' },
  { id: 'subscriptions', label: 'Předplatné', emoji: '🔁', kind: 'expense', group: 'wants', fixed: true },
  { id: 'shopping', label: 'Nákupy a oblečení', emoji: '🛍️', kind: 'expense', group: 'wants' },
  { id: 'entertainment', label: 'Zábava a volný čas', emoji: '🎟️', kind: 'expense', group: 'wants' },
  { id: 'sport', label: 'Sport a fitness', emoji: '🏃', kind: 'expense', group: 'wants' },
  { id: 'travel', label: 'Cestování', emoji: '✈️', kind: 'expense', group: 'wants' },
  { id: 'pets', label: 'Mazlíčci', emoji: '🐾', kind: 'expense', group: 'wants' },
  { id: 'gifts', label: 'Dary a charita', emoji: '🎁', kind: 'expense', group: 'wants' },
  { id: 'cash', label: 'Výběry hotovosti', emoji: '💵', kind: 'expense', group: 'wants' },
  { id: 'fees', label: 'Bankovní poplatky', emoji: '🧾', kind: 'expense', group: 'needs' },
  { id: 'people_out', label: 'Platby lidem', emoji: '🤝', kind: 'expense', group: 'wants' },
  { id: 'other', label: 'Ostatní výdaje', emoji: '📦', kind: 'expense', group: 'wants' },

  { id: 'savings', label: 'Spoření a investice', emoji: '📈', kind: 'saving', group: 'savings', fixed: true },
  { id: 'transfer', label: 'Převod mezi účty', emoji: '🔄', kind: 'transfer' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function category(id) {
  return CATEGORY_BY_ID[id] || CATEGORY_BY_ID.other;
}

// Pravidla se testují na text bez diakritiky a malými písmeny
// (protistrana + zpráva + typ transakce). Pořadí = priorita.
const r = (s) => new RegExp(s);
export const RULES = [
  ['transfer', r('prevod mezi (vlastnimi )?ucty|vlastni ucet|na muj ucet|top[- ]?up|dobiti (uctu|revolut)|own account|internal transfer|prevod na sporici ucet')],
  ['savings', r('portu|fondee|xtb|trading ?212|degiro|interactive brokers|anycoin|coinmate|coinbase|binance|penzijni|stavebni sporeni|investi|amundi|conseq|patria|finax|indexus|sporici ucet|savings|vault')],
  ['salary', r('mzda|vyplata|vyuctovani mzdy|plat za|salary|payroll|wages|odmena za|honorar|faktura c')],
  ['interest', r('pripsany urok|kreditni urok|urok(y)? |uroky$|^urok|interest|dividend|vynos')],
  ['taxes', r('financni urad|\\bcssz\\b|socialni zabezpeceni|zdravotni pojistovna|\\bvzp\\b|\\bdan\\b|\\bdane\\b|pokuta|spravni poplatek|mestsky urad|magistrat|poplatek za odpad|katastr')],
  ['fees', r('poplatek|poplatky|vedeni uctu|fee$|monthly fee|plan fee|urok z precerpani|sankcni')],
  ['cash', r('vyber z bankomatu|vyber hotovosti|bankomat|\\batm\\b|cash withdrawal|vyber atm|vyber kartou')],
  ['delivery', r('wolt|foodora|bolt food|damejidlo|dame jidlo|uber ?eats|lieferando|glovo')],
  ['groceries', r('supermerca|supermark|minimarket|vmart|relay|caprabo|mercadona|carrefour|eroski|\\bdia\\b|rewe|edeka|aldi|netto|coca-cola|automat|vending|nyx\\*|albert|lidl|kaufland|tesco|billa|penny|globus|rohlik|kosik|makro|coop|norma|hruska|zabka|potravin|flop|tamda|ahold|spar |bio ?market|country life|marks ?& ?spencer food|vecerka|pekarna|reznictvi|zelenina')],
  ['household', r('\\bdm\\b|dm drogerie|rossmann|teta drogerie|drogerie|ikea|hornbach|obi |bauhaus|jysk|mobelix|xxxlutz|sconto|kika|hornbach|uklid')],
  ['subscriptions', r('netflix|spotify|hbo|max\\.com|disney|apple\\.com|icloud|google (storage|one|play)|youtube|amazon prime|prime video|voyo|oneplay|skyshowtime|audible|storytel|chatgpt|openai|anthropic|claude\\.ai|microsoft|office 365|adobe|dropbox|github|notion|canva|patreon|predplatne|subscription|deezer|tidal|duolingo plus|nyt|seznam premium|denik n|respekt')],
  ['restaurants', r('\\bfood\\b|hostinec|restau|jidelni vuz|vapiano|chata|food lounge|popeyes|ginza|comebuy|bubble tea|donuland|\\bbb\\b|qerko|beer|pivovar|\\bpub\\b|hamburg|gastro|restaura|bistro|kavarn|cafe|caffe|coffee|starbucks|costa|mcdonald|kfc|burger|subway|pizz|bageterie|\\bpaul\\b|ugo|kantyn|jidelna|hospod|pivnic|\\bbar\\b|sushi|\\bpho\\b|kebab|ramen|bufet|\\blokal\\b|cukrarn|trdeln|zmrzlin|kantina')],
  ['transport', r('\\bbus\\b|\\bcsad\\b|arriva|dpmhk|dopravni podnik|autobus|\\bdpp\\b|\\bpid\\b|litack|ceske drahy|cd\\.cz|regiojet|leo express|flixbus|\\bbolt\\b|\\buber\\b|liftago|taxi|mhd|dpmb|jizdenk|jizdne|parkovani|parking|\\blime\\b|rekola|nextbike')],
  ['car', r('shell|\\bomv\\b|\\bmol\\b|benzina|orlen|eurooil|\\bono\\b|cerpaci|autoservis|pneu|dalnic|\\bstk\\b|mycka|autodil|tankovani|\\bcepro\\b')],
  ['housing', r('najem|najemne|hypote|\\bsvj\\b|spolecenstvi vlastniku|bytove druzstvo|fond oprav|sluzby spojene s uzivanim|zaloha na sluzby|rent\\b')],
  ['utilities', r('\\bcez\\b|\\bpre\\b|prazska energetika|innogy|e\\.on|\\beon\\b|plynarensk|\\bpvk\\b|vodovod|vodarn|teplarn|\\bsipo\\b|elektrin|\\bplyn\\b|bohemia energy|centropol|\\bmnd\\b|energie')],
  ['telecom', r('\\bo2\\b|t-mobile|tmobile|vodafone|\\bupc\\b|nordic telecom|starnet|kaktus|mobilni operator|internet (pripojeni|sluzby)|telekom|\\bgo ?mobil')],
  ['health', r('lekarn|dr\\.? ?max|benu|pilulka|zdravi|lekar|zubar|nemocnic|klinik|optik|poliklin|ordinace|fyzio|laborator|ocni')],
  ['sport', r('proteinomat|koupalist|aquapark|plavecky|sportovni hala|sportcentrum|fitness|\\bgym\\b|posilovn|multisport|bazen|squash|tenis|yoga|joga|sportovni klub|form factory|holmes place|lezeck|boulder|crossfit|sportisimo|decathlon')],
  ['entertainment', r('betano|kaizen ?gamin|allwyn|sazka|tipsport|fortuna|chance|synot|events?\\b|party|\\bkino\\b|cinema|cinestar|divadl|koncert|ticketportal|goout|ticketmaster|vstupen|steam|playstation|xbox|nintendo|epic games|knihkup|kosmas|luxor|martinus|dobrovsk|muzeum|museum|\\bzoo\\b|bowling|escape|festival')],
  ['travel', r('booking\\.com|airbnb|hotel|ryanair|wizz|smartwings|easyjet|lufthansa|czech airlines|letenk|kiwi\\.com|invia|cedok|fischer|expedia|hostel|penzion|pension|ubytovani|letiste|airport')],
  ['insurance', r('pojist|pojisteni|kooperativa|allianz|generali|ceska podnikatelska|\\bcpp\\b|uniqa|\\baxa\\b|direct pojist|nn zivotni|metlife|maxima')],
  ['loans', r('splatk|\\buver|pujck|leasing|home ?credit|cofidis|essox|provident|zonky|kreditni karta splatka')],
  ['education', r('vse\\.cz|cvut|\\bmuni\\b|\\buk\\.cz|skoleni|\\bkurz|udemy|coursera|skolne|univerzit|skolk|jazykov|duolingo|vzdelav')],
  ['kids', r('hrack|detsk|krouzek|plenk|babyland|bambule|dm baby|pampers')],
  ['pets', r('zverolekar|veterin|krmivo|pet ?center|super ?zoo|zoohit|zoo market|granule')],
  ['gifts', r('\\bdar\\b|darek|sbirk|charita|clovek v tisni|unicef|darujme|donio|nadace|nadacni|lekari bez hranic|kvetin')],
  ['shopping', r('celio|souvenir|bershka|pull ?& ?bear|stradivarius|alza|mall\\.cz|\\bmall\\b|datart|\\bczc\\b|electro world|notino|zalando|about ?you|h&m|\\bhm\\b|zara|reserved|primark|answear|aliexpress|temu|shein|amazon|ebay|vinted|allegro|bonprix|tchibo|pepco|\\baction\\b|\\bkik\\b|lindex|\\bccc\\b|deichmann|footshop|apple store|istyle|mironet|kasa\\.cz|bata|marks|uniqlo|new yorker|mango|c&a')],
  ['refund', r('vraceni|refund|vratka|storno|reklamace|cashback|chargeback|vraceni platby')],
];

// Kategorie, které má smysl ponechat i u kladné částky (jinak jde o vratku).
const POSITIVE_OK = new Set(['transfer', 'savings', 'salary', 'interest', 'refund']);

/** Text, podle kterého se kategorizuje. */
export function txText(tx) {
  return [tx.counterparty, tx.message, tx.type]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Slova, která v názvu protistrany znamenají firmu/obchod, ne člověka.
const NOT_A_NAME = /\b(sro|s\.?r\.?o|a\.?s|spol|ltd|gmbh|inc|cz|com|eu|shop|store|market|potraviny|testoviny|bistro|cafe|bar|pizza|restaurant|hotel|salon|studio|centrum|servis|group|payment|membership|subscription|prodej|kemp|kralove|praha|brno|ostrava|plzen|olomouc|liberec|pardubice|banka|bank|pojistovna|urad|skola|klub|obchod|hostinec|chata|jidelni|vuz|hora|chodov|narodni|palladium|futurum|galerie|nadrazi|namesti|ulice|lounge|vino|pivo|kavarna|cukrarna|pekarna|lekarna|trafika|sklad|outlet|park|zahrada|dum|domov|google|apple|microsoft|adobe|amazon|netflix|spotify|paypal|revolut)\b/;

/** Vypadá protistrana jako jméno člověka? („BARBORA KAŠPAROVÁ“, „Novák, Jan“) */
export function looksLikePerson(name) {
  const raw = String(name || '').trim();
  if (!raw || /[0-9*@/&.+:_]/.test(raw)) return false;
  const folded = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (NOT_A_NAME.test(folded)) return false;
  const words = folded.split(/[\s,]+/).filter(Boolean);
  return words.length >= 2 && words.length <= 3 && words.every((w) => /^[a-z][a-z'-]+$/.test(w));
}

/** Kategorie podle vestavěných pravidel (bez uživatelských úprav). */
export function autoCategory(tx) {
  const text = txText(tx);
  for (const [id, re] of RULES) {
    if (!re.test(text)) continue;
    const kind = CATEGORY_BY_ID[id].kind;
    if (tx.amount > 0) {
      if (POSITIVE_OK.has(id)) return id;
      return 'refund'; // peníze zpět od obchodníka
    }
    if (kind === 'income') continue; // např. „úrok“ u záporné částky = poplatek/splátka
    return id;
  }
  if (looksLikePerson(tx.counterparty)) return tx.amount > 0 ? 'people_in' : 'people_out';
  return tx.amount > 0 ? 'income_other' : 'other';
}

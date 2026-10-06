# 🐷 Kasička – jednoduchý finance tracker

Jednou měsíčně nahraješ výpisy ze všech účtů (CSV) a Kasička:

- **rozřadí transakce do ~30 kategorií** podle pravidel pro stovky českých obchodníků (Albert, Lidl, Rohlík, Wolt, ČEZ, O2, Netflix, Alza…),
- **pozná převody mezi vlastními účty**, takže je nepočítá do příjmů ani výdajů,
- **oddělí pravidelné výdaje od nepravidelných** (trvalé příkazy, inkasa, předplatné, stejný příjemce s podobnou částkou v několika měsících),
- **shrne příjmy, výdaje, úspory a míru úspor** a porovná je s minulým měsícem,
- **najde, kde ušetřit** (předplatné, rozvoz jídla, restaurace, poplatky, drobné nákupy, tarify, skoky v kategoriích) s odhadem úspory za rok,
- **navrhne, jak víc vydělat** (peníze ležící ladem na účtu, chybějící úroky, pravidelné investování, cashback, další zdroje příjmů),
- ukáže **pravidlo 50/30/20**, vývoj po měsících a průběh útrat během měsíce.

Co v tabulce transakcí opravíš (kategorii nebo pravidelnost), si Kasička zapamatuje pro všechny platby od stejného obchodníka.

**Soukromí:** vše běží jen ve tvém prohlížeči a data se ukládají do jeho úložiště (localStorage). Nic se neodesílá na žádný server.

## Spuštění

```bash
npm install
npm run dev        # http://localhost:5173
```

Statická verze k nasazení kamkoliv (GitHub Pages, Netlify…): `npm run build` → složka `dist/`.

Na úvodní obrazovce je tlačítko **„Vyzkoušet na ukázkových datech“**, které načte tři smyšlené výpisy (`public/samples/`) ve formátech různých bank.

## Jaké výpisy fungují

CSV export z internetového bankovnictví. Sloupce se rozpoznávají automaticky podle názvů v hlavičce (česky i anglicky), takže funguje většina bank: Česká spořitelna (George), ČSOB, Komerční banka, Air Bank, Fio, Raiffeisenbank, mBank, Moneta, Revolut, Wise…

- kódování UTF-8 i Windows-1250, oddělovač `;` `,` nebo tabulátor,
- částka jako jeden sloupec (se znaménkem nebo se sloupcem „směr“), nebo zvlášť příjem/výdaj,
- řádky nad hlavičkou (číslo účtu atd.) se přeskočí, číslo účtu se z nich načte,
- opakované nahrání stejného výpisu nevytvoří duplicity.

Každý soubor = jeden účet (název se vezme z názvu souboru a jde přejmenovat v sekci *Účty a nastavení*).

## Ilustrace přes Codex

Ilustrace (hero obrázek, logo, prázdný stav, ikony tipů) jsou vygenerované přes Codex; ručně kreslená SVG ve stejné složce slouží jako záloha. Prompty pro jejich vygenerování přes [Codex CLI](https://github.com/openai/codex) jsou ve `scripts/generate-images.mjs`:

```bash
npm i -g @openai/codex && codex login
npm run images            # všechny obrázky
npm run images -- hero    # jen vybrané
```

Skript obrázky z Codexu zmenší a uloží jako `src/assets/img/<název>.webp`; aplikace je automaticky použije místo SVG (`src/images.js`), včetně faviconu. Když WebP smažeš, vrátí se SVG. Už stažená PNG jde jen převést přes `npm run images -- --optimize`.

## Struktura

```
src/lib/importer.js    CSV → transakce (detekce sloupců, čísel, dat, kódování)
src/lib/categories.js  kategorie + pravidla pro obchodníky
src/lib/pipeline.js    kategorizace, převody mezi účty, pravidelné platby
src/lib/analysis.js    měsíční souhrny, trendy, pravidelné závazky
src/lib/insights.js    tipy na úspory a vyšší výdělek
src/main.js, src/ui/   rozhraní a SVG grafy
tests/                 testy (npm test)
```

Přidat obchodníka do kategorie = připsat ho do regulárního výrazu v `src/lib/categories.js`.

> Tipy jsou orientační odhady z tvých dat, ne finanční poradenství.

#!/usr/bin/env node
// Vygeneruje ilustrace aplikace přes Codex CLI (https://github.com/openai/codex).
//
// Předpoklady: `npm i -g @openai/codex` a přihlášení (`codex login`).
// Použití:     npm run images              – všechny obrázky
//              npm run images -- hero idea – jen vybrané
//
// Každý obrázek se uloží jako src/assets/img/<název>.png. Aplikace pak PNG
// automaticky použije místo ručně kreslené SVG verze (viz src/images.js).
// Když PNG smažeš, vrátí se SVG.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Na Windows je `codex` .cmd shim, který spawnSync bez shellu nenajde.
const SHELL = process.platform === 'win32';

const STYLE =
  'Flat vector illustration in a soft, friendly, modern fintech style. ' +
  'Palette: deep green #0F5B4F, emerald #2FA784, mint #9FE0C7, coral #F28C6B, warm gold #F2B84B, cream #FFF4E0. ' +
  'Rounded geometric shapes, gentle soft shadows, very subtle paper grain, plenty of breathing room. ' +
  'Absolutely no text, letters, numbers, currency symbols or logos.';

const ICON = 'Square 1024x1024 icon tile with a soft pastel rounded-square background filling the canvas, one centered object, simple and readable at 56 px.';

export const IMAGES = {
  hero: {
    size: '1536x1024',
    prompt: `Landscape hero illustration for a personal finance app called "Kasička" (Czech for piggy bank). A cheerful coral piggy bank in the foreground, a coin dropping into it, a paper receipt on the left, a floating card with a rising bar chart on the right and a small green plant growing out of a stack of gold coins. Background: soft gradient from mint to cream with large blurred circles. ${STYLE}`,
  },
  empty: {
    size: '1024x1024',
    prompt: `Two bank statement sheets gently falling into an open deep-green folder with an upward arrow, on a transparent background. Conveys "drop your files here". ${STYLE}`,
    transparent: true,
  },
  logo: {
    size: '1024x1024',
    prompt: `App icon: a minimal mint piggy bank seen from the side with a gold coin above its slot, on a deep green (#0F5B4F) rounded-square background. ${STYLE}`,
  },
  subscriptions: { size: '1024x1024', prompt: `${ICON} A coral streaming/video card with a play triangle and a small circular repeat arrow badge. Light peach background. ${STYLE}` },
  food: { size: '1024x1024', prompt: `${ICON} A steaming gold bowl of food with three wavy coral steam lines. Light warm-yellow background. ${STYLE}` },
  bank: { size: '1024x1024', prompt: `${ICON} A classic bank building with columns in deep green and emerald, a small gold coin in the pediment. Light mint background. ${STYLE}` },
  coins: { size: '1024x1024', prompt: `${ICON} A small stack of gold coins with one coin standing next to it. Light warm-yellow background. ${STYLE}` },
  bills: { size: '1024x1024', prompt: `${ICON} A utility bill document next to a glowing light bulb with a downward check mark (lower price). Light blue background. ${STYLE}` },
  warning: { size: '1024x1024', prompt: `${ICON} A rounded coral warning triangle with a white exclamation mark. Light peach background. ${STYLE}` },
  trend: { size: '1024x1024', prompt: `${ICON} Three rising coral bars with a dark coral arrow line going up and to the right (spending growing). Light peach background. ${STYLE}` },
  growth: { size: '1024x1024', prompt: `${ICON} A small two-leaf green sprout growing out of a gold coin. Light mint background. ${STYLE}` },
  idea: { size: '1024x1024', prompt: `${ICON} A glowing gold light bulb with short rays around it. Light warm-yellow background. ${STYLE}` },
};

function main() {
  const which = process.argv.slice(2);
  const names = which.length ? which : Object.keys(IMAGES);
  const check = spawnSync('codex', ['--version'], { encoding: 'utf8', shell: SHELL });
  if (check.error || check.status !== 0) {
    console.error('Codex CLI nenalezen. Nainstaluj ho: npm i -g @openai/codex && codex login');
    process.exit(1);
  }
  for (const name of names) {
    const spec = IMAGES[name];
    if (!spec) {
      console.error(`Neznámý obrázek „${name}“. Dostupné: ${Object.keys(IMAGES).join(', ')}`);
      continue;
    }
    const out = resolve('src/assets/img', `${name}.png`);
    const task =
      `Generate ONE image with your image generation tool and save it as a PNG file at exactly this path: ${out}\n` +
      `Size: ${spec.size}.${spec.transparent ? ' Use a transparent background.' : ''}\n` +
      `Do not modify any other files.\n\nImage prompt:\n${spec.prompt}`;
    console.log(`→ ${name} (${spec.size})`);
    // Zadání jde přes stdin (`-`), aby víceřádkový prompt přežil i shell na Windows.
    const r = spawnSync('codex', ['exec', '--sandbox', 'workspace-write', '--skip-git-repo-check', '-'], {
      input: task,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: SHELL,
    });
    if (r.status !== 0 || !existsSync(out)) console.error(`  ✗ ${name}: Codex obrázek neuložil (zkontroluj výstup výše).`);
    else console.log(`  ✓ uloženo do ${out}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

// Ilustrace: pokud existuje vygenerovaný obrázek (PNG/WebP z Codexu, viz
// scripts/generate-images.mjs), použije se přednostně; jinak SVG fallback.
const files = import.meta.glob('./assets/img/*.{svg,png,webp}', { eager: true, query: '?url', import: 'default' });

const byName = {};
for (const [path, url] of Object.entries(files)) {
  const [, name, ext] = path.match(/\/([^/]+)\.(\w+)$/);
  const rank = ext === 'svg' ? 0 : 1;
  if (!byName[name] || rank > byName[name].rank) byName[name] = { url, rank };
}

export const img = (name) => byName[name]?.url || '';

/** Doplní src všem <img data-img="..."> v daném kořeni. */
export function hydrateImages(root = document) {
  for (const el of root.querySelectorAll('img[data-img]')) {
    const url = img(el.dataset.img);
    if (url && el.getAttribute('src') !== url) el.src = url;
  }
}

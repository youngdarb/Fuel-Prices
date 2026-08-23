// Regenerates the static price table baked into index.html from prices.json.
//
// Crawlers and no-JavaScript visitors see this table, so it must match the
// live data. Left unattended it goes stale and the site advertises prices
// that are weeks out of date.
//
// Run: node scripts/refresh-static-prices.js
// Exits 0 with "unchanged" when nothing needs committing.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const START = '<!-- STATIC-PRICES:START';
const END = '<!-- STATIC-PRICES:END -->';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const num = v => (typeof v === 'number' && v > 0 ? v.toFixed(1) : '—');

const prices = JSON.parse(fs.readFileSync(path.join(ROOT, 'prices.json'), 'utf8'));

// Same ordering as the live page: cheapest unleaded first, diesel as tiebreak
const stations = (prices.stations || [])
  .filter(s => s.name && (s.unleaded > 0 || s.diesel > 0))
  .sort((a, b) => {
    const ul = (a.unleaded || Infinity) - (b.unleaded || Infinity);
    return ul !== 0 ? ul : (a.diesel || Infinity) - (b.diesel || Infinity);
  });

const rows = stations.map(s =>
  `    <tr><td class="station-name">${esc(s.name)}</td>` +
  `<td class="num">${num(s.unleaded)}</td>` +
  `<td class="num">${num(s.diesel)}</td>` +
  `<td class="num">${num(s.super)}</td>` +
  `<td class="num">${num(s.marine)}</td>` +
  `<td class="num">${num(s.bio_diesel)}</td>` +
  `<td class="num">${num(s.df_diesel)}</td>` +
  `<td class="notes-col">${esc(s.notes)}</td>` +
  `<td class="date-col">${esc(s.date)}</td></tr>`
).join('\n');

const file = path.join(ROOT, 'index.html');
const html = fs.readFileSync(file, 'utf8');

const startIdx = html.indexOf(START);
const endIdx = html.indexOf(END);
if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find STATIC-PRICES markers in index.html');
  process.exit(1);
}

const startLineEnd = html.indexOf('\n', startIdx);
const updated =
  html.slice(0, startLineEnd + 1) +
  rows + '\n' +
  html.slice(endIdx - 4 >= 0 && html.slice(endIdx - 4, endIdx) === '    ' ? endIdx - 4 : endIdx);

if (updated === html) {
  console.log('unchanged');
  process.exit(0);
}

fs.writeFileSync(file, updated);
console.log(`updated ${stations.length} rows (prices dated ${prices.updated || 'unknown'})`);

/**
 * Fügt nach `expo export` statische Open-Graph-/Twitter-Meta-Tags in dist/index.html ein
 * (nur Titel und Beschreibung — keine Grafik, kompakte Link-Vorschau).
 *
 * SITE_ORIGIN=https://deine-domain.tld node scripts/inject-og-meta.cjs
 */
const fs = require('fs');
const path = require('path');

const distHtml = path.join(__dirname, '..', 'dist', 'index.html');

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://wortfindung.app').replace(/\/$/, '');
const BASE_PATH = '/WortFindung';
const canonical = `${SITE_ORIGIN}${BASE_PATH}/`;

const block = `
    <meta name="description" content="Tägliches Wortspiel — ein Ratewort pro Tag. Deutsch &amp; English." />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="WortFindung" />
    <meta property="og:title" content="WortFindung" />
    <meta property="og:description" content="Tägliches Wortspiel — ein Ratewort pro Tag." />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:locale" content="de_DE" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="WortFindung" />
    <meta name="twitter:description" content="Tägliches Wortspiel — ein Ratewort pro Tag." />
`;

function main() {
  if (!fs.existsSync(distHtml)) {
    console.error('inject-og-meta: dist/index.html nicht gefunden. Zuerst expo export ausführen.');
    process.exit(1);
  }
  let html = fs.readFileSync(distHtml, 'utf8');
  if (html.includes('property="og:title"')) {
    console.log('inject-og-meta: OG-Tags schon vorhanden, überspringe.');
    return;
  }
  const needle = '</title>';
  const idx = html.indexOf(needle);
  if (idx === -1) {
    console.error('inject-og-meta: </title> in index.html nicht gefunden.');
    process.exit(1);
  }
  const insertAt = idx + needle.length;
  html = html.slice(0, insertAt) + block + html.slice(insertAt);
  fs.writeFileSync(distHtml, html);
  console.log('inject-og-meta: Open-Graph-Meta in dist/index.html eingefügt.');
}

main();

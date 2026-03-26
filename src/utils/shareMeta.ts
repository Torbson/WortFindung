import { Platform } from 'react-native';

function setMeta(attr: 'property' | 'name', key: string, content: string) {
  const sel = attr === 'property' ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkRel(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function formatDateForMeta(iso: string, lang: 'de' | 'en'): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dObj = new Date(Date.UTC(y, m - 1, d));
  return dObj.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Open Graph / Twitter: nur Titel und Kurzbeschreibung (kein eigenes Vorschaubild) —
 * Messenger zeigen damit eine kompakte Link-Karte mit Text.
 * Nach `history.replaceState` erneut aufrufen.
 */
export function applyShareMetaTags(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const href = window.location.href;
  const params = new URLSearchParams(window.location.search);
  const l = params.get('l');
  const n = params.get('n');
  const d = params.get('d');
  const g = params.get('g');

  const lang: 'de' | 'en' = l === 'en' ? 'en' : 'de';
  const validLengths = [4, 5, 6, 7, 8];
  const nParsed = n ? parseInt(n, 10) : NaN;
  const wl = validLengths.includes(nParsed) ? nParsed : undefined;
  const dateOk = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;

  let title = 'WortFindung';
  let description =
    lang === 'de'
      ? 'Tägliches Wortspiel — ein Ratewort pro Tag.'
      : 'Daily word puzzle — one word per day.';

  const langFromUrl = l === 'de' || l === 'en' ? l : null;
  if (g && langFromUrl && wl && dateOk) {
    const sl = langFromUrl;
    title = sl === 'de' ? 'Geteiltes Ergebnis · WortFindung' : 'Shared result · WortFindung';
    description =
      sl === 'de'
        ? `Rätsel ${dateOk} · ${wl} Buchstaben. Zum Ansehen öffnen.`
        : `Puzzle ${dateOk} · ${wl} letters. Open the link to view.`;
  } else if (wl && dateOk) {
    const dateStr = formatDateForMeta(dateOk, lang);
    title =
      lang === 'de'
        ? `WortFindung · ${wl} Buchstaben · ${dateStr}`
        : `WortFindung · ${wl} letters · ${dateStr}`;
    description =
      lang === 'de'
        ? `Rätsel für ${dateStr}. Jetzt im Browser spielen.`
        : `Puzzle for ${dateStr}. Play in your browser.`;
  }

  document.title = title;

  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', href);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', 'WortFindung');
  setMeta('name', 'twitter:card', 'summary');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setLinkRel('canonical', href);
}

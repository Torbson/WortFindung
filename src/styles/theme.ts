import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

/**
 * Akzentfarben inspiriert von Mountain Dew (Grün / Goldgelb).
 * Neutrale Flächen: reine Graustufen (kein Grünstich), bewusst andere Werte als beim Original-Wordle.
 */
export const COLORS = {
  /** Etwas heller als Wordle (#121213), neutral kühles Anthrazit */
  background: '#18181b',
  headerBorder: '#3f3f46',
  tileBg: '#18181b',
  tileBorder: '#52525b',
  tileBorderFilled: '#71717a',
  tileText: '#ffffff',
  /** Kräftiges „Dew“-Grün */
  correct: '#00A651',
  /** Sattes Zitrus-/Goldgelb */
  present: '#C9A008',
  /** Neutrales Dunkelgrau für „nicht im Wort“ */
  absent: '#3f3f46',
  /** Tastatur-Standard (neutral) */
  keyBg: '#71717a',
  keyText: '#ffffff',
  /** Inaktiv / durchgestrichen */
  absentMuted: '#a1a1aa',
  white: '#ffffff',
};

/**
 * Abgerundete System-UI ohne Download (kein Webfont).
 * Web: `ui-rounded` wird in Chrome/Firefox/Edge **nicht** unterstützt (nur Safari) – daher
 * zuerst **SF Pro Rounded** per Namen (lokal auf Apple-Geräten), dann ui-rounded, dann System-Sans.
 * Windows: kein SF Pro → Fallback; ggf. etwas weichere Segoe-Variante über `Segoe UI Variable`.
 * iOS: SF Pro Rounded (system).
 * Android: kein natives `ui-rounded` → klassisches `sans-serif` (Roboto o. ä.).
 */
const SYSTEM_FONT_FAMILY = Platform.select({
  web: '"SF Pro Rounded", ui-rounded, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  ios: 'SF Pro Rounded',
  android: 'sans-serif',
  default: 'sans-serif',
});

/**
 * DRY: `fontFamily` + `fontWeight` – in StyleSheets per `...TEXT.bold` usw.
 */
export const TEXT: Record<'regular' | 'semibold' | 'bold', TextStyle> = {
  regular: {
    fontFamily: SYSTEM_FONT_FAMILY,
    fontWeight: '400',
  },
  semibold: {
    fontFamily: SYSTEM_FONT_FAMILY,
    fontWeight: '600',
  },
  bold: {
    fontFamily: SYSTEM_FONT_FAMILY,
    fontWeight: '700',
  },
};

export const KEYBOARD_LAYOUTS = {
  de: [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
    ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
  ],
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
  ],
} as const;

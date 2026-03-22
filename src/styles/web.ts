/**
 * Alles für die Web-Shell (Expo Web): globales CSS + Meta, das nicht über RN-Styles läuft.
 */
import { COLORS } from './theme';

/** Meta viewport – zentral, falls sich Werte ändern */
export const WEB_VIEWPORT_META =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

/**
 * CSS für ein injiziertes style-Tag: html/body/#root (Vollbild, keine Selection, Safe Area).
 * Hintergrund aus {@link COLORS.background}.
 */
export function getWebGlobalCss(): string {
  return `
html, body, #root {
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  background-color: ${COLORS.background};
}
body {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  position: fixed;
  width: 100%;
}
`.trim();
}

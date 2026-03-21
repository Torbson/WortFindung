export const COLORS = {
  background: '#121213',
  headerBorder: '#3a3a3c',
  tileBg: '#121213',
  tileBorder: '#3a3a3c',
  tileBorderFilled: '#565758',
  tileText: '#ffffff',
  correct: '#538d4e',
  present: '#b59f3b',
  absent: '#3a3a3c',
  keyBg: '#818384',
  keyText: '#ffffff',
  white: '#ffffff',
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

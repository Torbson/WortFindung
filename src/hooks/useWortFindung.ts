import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { evaluateGuess, TileStatus } from '../utils/gameLogic';
import { SOLUTIONS_DE, VALID_DE } from '../data/wordsDE';
import { SOLUTIONS_EN, VALID_EN } from '../data/wordsEN';

export type Language = 'de' | 'en';
export type WordLength = 4 | 5 | 6 | 7 | 8;
export type LetterStatus = 'correct' | 'present' | 'absent';

export const GAME_ROWS: Record<WordLength, number> = {
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
};

interface WortFindungState {
  solution: string;
  guesses: string[];
  evaluations: TileStatus[][];
  currentGuess: string[];
  selectedCell: number;
  popCell: number;
  currentRow: number;
  gameOver: boolean;
  gameWon: boolean;
  message: string;
  letterStatuses: Record<string, LetterStatus>;
  shake: boolean;
  revealRow: number;
  startedAt: number | null;
  solvedAt: number | null;
}

const validWordsCache: Record<string, Set<string>> = {};

function getSolutions(lang: Language, wordLength: WordLength): string[] {
  return (lang === 'de' ? SOLUTIONS_DE : SOLUTIONS_EN)[wordLength] ?? [];
}

function getValidWords(lang: Language, wordLength: WordLength): Set<string> {
  const key = `${lang}${wordLength}`;
  if (!validWordsCache[key]) {
    const valid = (lang === 'de' ? VALID_DE : VALID_EN)[wordLength] ?? [];
    const solutions = getSolutions(lang, wordLength);
    validWordsCache[key] = new Set([...solutions, ...valid]);
  }
  return validWordsCache[key];
}

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function getDailyWord(solutions: string[], dateKey?: string): string {
  let noonUtc: number;
  if (dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    noonUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  } else {
    const now = new Date();
    noonUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0);
  }
  const timestamp = Math.floor(noonUtc / 1000);

  let hash = 5381;
  const str = timestamp.toString();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }

  const index = Math.abs(hash) % solutions.length;
  return solutions[index];
}

function storageKey(lang: Language, wordLength: WordLength, dateKey: string): string {
  return `wortfindung-${lang}-${wordLength}-${dateKey}`;
}

function saveState(lang: Language, wordLength: WordLength, dateKey: string, state: WortFindungState): void {
  if (Platform.OS !== 'web') return;
  try {
    const { shake, revealRow, message, popCell, ...persistable } = state;
    localStorage.setItem(storageKey(lang, wordLength, dateKey), JSON.stringify(persistable));
  } catch { /* storage full or unavailable */ }
}

function loadState(lang: Language, wordLength: WordLength, dateKey: string): Partial<WortFindungState> | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = localStorage.getItem(storageKey(lang, wordLength, dateKey));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function emptyGuess(length: number): string[] {
  return Array(length).fill('');
}

function parseCurrentGuess(saved: unknown, wordLength: number): string[] {
  if (Array.isArray(saved)) {
    const arr = saved as string[];
    if (arr.length === wordLength) return arr;
    return Array.from({ length: wordLength }, (_, i) => arr[i] || '');
  }
  if (typeof saved === 'string') {
    return Array.from({ length: wordLength }, (_, i) => (saved as string)[i] || '');
  }
  return emptyGuess(wordLength);
}

function firstEmptyIndex(guess: string[]): number {
  const idx = guess.indexOf('');
  return idx === -1 ? guess.length - 1 : idx;
}

function createInitialState(lang: Language, wordLength: WordLength, dateOverride?: string): WortFindungState {
  const solutions = getSolutions(lang, wordLength);
  const dateKey = dateOverride ?? getTodayDateKey();
  const saved = loadState(lang, wordLength, dateKey);
  const solution = getDailyWord(solutions, dateKey);

  if (saved && saved.solution === solution) {
    const currentGuess = parseCurrentGuess(saved.currentGuess, wordLength);
    return {
      solution: saved.solution,
      guesses: saved.guesses ?? [],
      evaluations: saved.evaluations ?? [],
      currentGuess,
      selectedCell: firstEmptyIndex(currentGuess),
      popCell: -1,
      currentRow: saved.currentRow ?? 0,
      gameOver: saved.gameOver ?? false,
      gameWon: saved.gameWon ?? false,
      message: '',
      letterStatuses: saved.letterStatuses ?? {},
      shake: false,
      revealRow: -1,
      startedAt: (saved as any).startedAt ?? null,
      solvedAt: (saved as any).solvedAt ?? null,
    };
  }

  return {
    solution,
    guesses: [],
    evaluations: [],
    currentGuess: emptyGuess(wordLength),
    selectedCell: 0,
    popCell: -1,
    currentRow: 0,
    gameOver: false,
    gameWon: false,
    message: '',
    letterStatuses: {},
    shake: false,
    revealRow: -1,
    startedAt: null,
    solvedAt: null,
  };
}

export function useWortFindung(language: Language, wordLength: WordLength, dateOverride?: string) {
  const [state, setState] = useState<WortFindungState>(() => createInitialState(language, wordLength, dateOverride));
  const messageTimer = useRef<ReturnType<typeof setTimeout>>();
  const maxRows = GAME_ROWS[wordLength];
  const effectiveDateKey = dateOverride ?? getTodayDateKey();

  useEffect(() => {
    setState(createInitialState(language, wordLength, dateOverride));
  }, [language, wordLength, dateOverride]);

  useEffect(() => {
    saveState(language, wordLength, effectiveDateKey, state);
  }, [state, language, wordLength, effectiveDateKey]);

  const flashMessage = useCallback((msg: string, persist = false) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setState(prev => ({ ...prev, message: msg }));
    if (!persist) {
      messageTimer.current = setTimeout(() => {
        setState(prev => ({ ...prev, message: '' }));
      }, 2000);
    }
  }, []);

  const addLetter = useCallback((letter: string) => {
    setState(prev => {
      if (prev.gameOver) return prev;
      const newGuess = [...prev.currentGuess];
      const cell = prev.selectedCell;
      newGuess[cell] = letter.toUpperCase();

      let nextCell = cell;
      for (let i = 1; i <= wordLength; i++) {
        const idx = (cell + i) % wordLength;
        if (!newGuess[idx]) {
          nextCell = idx;
          break;
        }
      }
      if (newGuess.every(c => c)) {
        nextCell = Math.min(cell + 1, wordLength - 1);
      }

      return { ...prev, currentGuess: newGuess, selectedCell: nextCell, popCell: cell };
    });
  }, [wordLength]);

  const deleteLetter = useCallback(() => {
    setState(prev => {
      if (prev.gameOver) return prev;
      const newGuess = [...prev.currentGuess];

      if (newGuess[prev.selectedCell]) {
        newGuess[prev.selectedCell] = '';
        return { ...prev, currentGuess: newGuess, popCell: -1 };
      }

      for (let i = prev.selectedCell - 1; i >= 0; i--) {
        if (newGuess[i]) {
          newGuess[i] = '';
          return { ...prev, currentGuess: newGuess, selectedCell: i, popCell: -1 };
        }
      }
      return prev;
    });
  }, []);

  const selectCell = useCallback((index: number) => {
    setState(prev => {
      if (prev.gameOver || index < 0 || index >= wordLength) return prev;
      return { ...prev, selectedCell: index };
    });
  }, [wordLength]);

  const moveSelection = useCallback((direction: -1 | 1) => {
    setState(prev => {
      if (prev.gameOver) return prev;
      const next = Math.max(0, Math.min(wordLength - 1, prev.selectedCell + direction));
      return { ...prev, selectedCell: next };
    });
  }, [wordLength]);

  const submitGuess = useCallback(() => {
    setState(prev => {
      if (prev.gameOver) return prev;

      const hasEmpty = prev.currentGuess.some(c => !c);
      if (hasEmpty) {
        const msg = language === 'de' ? 'Nicht genug Buchstaben' : 'Not enough letters';
        setTimeout(() => flashMessage(msg), 0);
        return { ...prev, shake: true };
      }

      const guessStr = prev.currentGuess.join('');
      const validWords = getValidWords(language, wordLength);
      if (!validWords.has(guessStr)) {
        const msg = language === 'de' ? 'Kein gültiges Wort' : 'Not in word list';
        setTimeout(() => flashMessage(msg), 0);
        return { ...prev, shake: true };
      }

      const evaluation = evaluateGuess(guessStr, prev.solution);
      const newLetterStatuses = { ...prev.letterStatuses };

      for (let i = 0; i < wordLength; i++) {
        const letter = prev.currentGuess[i];
        const status = evaluation[i];
        if (status === 'correct') {
          newLetterStatuses[letter] = 'correct';
        } else if (status === 'present' && newLetterStatuses[letter] !== 'correct') {
          newLetterStatuses[letter] = 'present';
        } else if (status === 'absent' && !newLetterStatuses[letter]) {
          newLetterStatuses[letter] = 'absent';
        }
      }

      const won = guessStr === prev.solution;
      const isLastRow = prev.currentRow === maxRows - 1;
      const gameOver = won || isLastRow;
      const now = Date.now();
      const startedAt = prev.startedAt ?? now;
      const solvedAt = gameOver ? now : null;

      if (won) {
        const winMsgs = language === 'de'
          ? ['Genial!', 'Großartig!', 'Sehr gut!', 'Gut!', 'Knapp!', 'Gerade noch!', 'Puh!', 'Wow!', 'Geschafft!']
          : ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Close!', 'Phew!', 'Wow!', 'Made it!'];
        const msgIdx = Math.min(prev.currentRow, winMsgs.length - 1);
        setTimeout(() => flashMessage(winMsgs[msgIdx], true), 1600);
      } else if (isLastRow) {
        setTimeout(() => flashMessage(prev.solution, true), 1600);
      }

      return {
        ...prev,
        guesses: [...prev.guesses, guessStr],
        evaluations: [...prev.evaluations, evaluation],
        currentGuess: emptyGuess(wordLength),
        selectedCell: 0,
        popCell: -1,
        currentRow: prev.currentRow + 1,
        gameOver,
        gameWon: won,
        letterStatuses: newLetterStatuses,
        shake: false,
        revealRow: prev.currentRow,
        startedAt,
        solvedAt,
      };
    });
  }, [language, wordLength, maxRows, flashMessage]);

  useEffect(() => {
    if (state.shake) {
      const t = setTimeout(() => setState(prev => ({ ...prev, shake: false })), 600);
      return () => clearTimeout(t);
    }
  }, [state.shake]);

  const durationSeconds = state.startedAt && state.solvedAt
    ? Math.round((state.solvedAt - state.startedAt) / 1000)
    : null;

  return {
    ...state,
    addLetter,
    deleteLetter,
    submitGuess,
    selectCell,
    moveSelection,
    rows: maxRows,
    cols: wordLength as number,
    durationSeconds,
    dateKey: effectiveDateKey,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { evaluateGuess, TileStatus } from '../utils/gameLogic';
import { WORDS_DE } from '../data/wordsDE';
import { WORDS_EN } from '../data/wordsEN';

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
  currentGuess: string;
  currentRow: number;
  gameOver: boolean;
  gameWon: boolean;
  message: string;
  letterStatuses: Record<string, LetterStatus>;
  shake: boolean;
  revealRow: number;
}

const validWordsCache: Record<string, Set<string>> = {};

function getSolutions(lang: Language, wordLength: WordLength): string[] {
  return (lang === 'de' ? WORDS_DE : WORDS_EN)[wordLength] ?? [];
}

function getValidWords(lang: Language, wordLength: WordLength): Set<string> {
  const key = `${lang}${wordLength}`;
  if (!validWordsCache[key]) {
    validWordsCache[key] = new Set(getSolutions(lang, wordLength));
  }
  return validWordsCache[key];
}

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function getDailyWord(solutions: string[]): string {
  const now = new Date();
  const noonUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0);
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
    const { shake, revealRow, message, ...persistable } = state;
    localStorage.setItem(storageKey(lang, wordLength, dateKey), JSON.stringify(persistable));
  } catch {}
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

function createInitialState(lang: Language, wordLength: WordLength): WortFindungState {
  const solutions = getSolutions(lang, wordLength);
  const dateKey = getTodayDateKey();
  const saved = loadState(lang, wordLength, dateKey);
  const solution = getDailyWord(solutions);

  if (saved && saved.solution === solution) {
    return {
      solution: saved.solution,
      guesses: saved.guesses ?? [],
      evaluations: saved.evaluations ?? [],
      currentGuess: saved.currentGuess ?? '',
      currentRow: saved.currentRow ?? 0,
      gameOver: saved.gameOver ?? false,
      gameWon: saved.gameWon ?? false,
      message: '',
      letterStatuses: saved.letterStatuses ?? {},
      shake: false,
      revealRow: -1,
    };
  }

  return {
    solution,
    guesses: [],
    evaluations: [],
    currentGuess: '',
    currentRow: 0,
    gameOver: false,
    gameWon: false,
    message: '',
    letterStatuses: {},
    shake: false,
    revealRow: -1,
  };
}

export function useWortFindung(language: Language, wordLength: WordLength) {
  const [state, setState] = useState<WortFindungState>(() => createInitialState(language, wordLength));
  const messageTimer = useRef<ReturnType<typeof setTimeout>>();
  const maxRows = GAME_ROWS[wordLength];

  useEffect(() => {
    setState(createInitialState(language, wordLength));
  }, [language, wordLength]);

  useEffect(() => {
    const dateKey = getTodayDateKey();
    saveState(language, wordLength, dateKey, state);
  }, [state, language, wordLength]);

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
      if (prev.gameOver || prev.currentGuess.length >= wordLength) return prev;
      return { ...prev, currentGuess: prev.currentGuess + letter.toUpperCase() };
    });
  }, [wordLength]);

  const deleteLetter = useCallback(() => {
    setState(prev => {
      if (prev.gameOver) return prev;
      return { ...prev, currentGuess: prev.currentGuess.slice(0, -1) };
    });
  }, []);

  const submitGuess = useCallback(() => {
    setState(prev => {
      if (prev.gameOver) return prev;

      if (prev.currentGuess.length !== wordLength) {
        const msg = language === 'de' ? 'Nicht genug Buchstaben' : 'Not enough letters';
        setTimeout(() => flashMessage(msg), 0);
        return { ...prev, shake: true };
      }

      const validWords = getValidWords(language, wordLength);
      if (!validWords.has(prev.currentGuess)) {
        const msg = language === 'de' ? 'Kein gültiges Wort' : 'Not in word list';
        setTimeout(() => flashMessage(msg), 0);
        return { ...prev, shake: true };
      }

      const evaluation = evaluateGuess(prev.currentGuess, prev.solution);
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

      const won = prev.currentGuess === prev.solution;
      const isLastRow = prev.currentRow === maxRows - 1;
      const gameOver = won || isLastRow;

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
        guesses: [...prev.guesses, prev.currentGuess],
        evaluations: [...prev.evaluations, evaluation],
        currentGuess: '',
        currentRow: prev.currentRow + 1,
        gameOver,
        gameWon: won,
        letterStatuses: newLetterStatuses,
        shake: false,
        revealRow: prev.currentRow,
      };
    });
  }, [language, wordLength, maxRows, flashMessage]);

  useEffect(() => {
    if (state.shake) {
      const t = setTimeout(() => setState(prev => ({ ...prev, shake: false })), 600);
      return () => clearTimeout(t);
    }
  }, [state.shake]);

  return {
    ...state,
    addLetter,
    deleteLetter,
    submitGuess,
    rows: maxRows,
    cols: wordLength as number,
  };
}

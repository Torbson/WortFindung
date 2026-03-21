import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { evaluateGuess, TileStatus } from '../utils/gameLogic';
import { SOLUTIONS_DE, VALID_WORDS_DE } from '../data/wordsDE';
import { SOLUTIONS_EN, VALID_WORDS_EN } from '../data/wordsEN';

export type Language = 'de' | 'en';
export type LetterStatus = 'correct' | 'present' | 'absent';

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

function storageKey(lang: Language, dateKey: string): string {
  return `wortfindung-${lang}-${dateKey}`;
}

function saveState(lang: Language, dateKey: string, state: WortFindungState): void {
  if (Platform.OS !== 'web') return;
  try {
    const { shake, revealRow, message, ...persistable } = state;
    localStorage.setItem(storageKey(lang, dateKey), JSON.stringify(persistable));
  } catch {}
}

function loadState(lang: Language, dateKey: string): Partial<WortFindungState> | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = localStorage.getItem(storageKey(lang, dateKey));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createInitialState(lang: Language): WortFindungState {
  const solutions = lang === 'de' ? SOLUTIONS_DE : SOLUTIONS_EN;
  const dateKey = getTodayDateKey();
  const saved = loadState(lang, dateKey);
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

export function useWortFindung(language: Language) {
  const [state, setState] = useState<WortFindungState>(() => createInitialState(language));
  const messageTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setState(createInitialState(language));
  }, [language]);

  useEffect(() => {
    const dateKey = getTodayDateKey();
    saveState(language, dateKey, state);
  }, [state, language]);

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
      if (prev.gameOver || prev.currentGuess.length >= 5) return prev;
      return { ...prev, currentGuess: prev.currentGuess + letter.toUpperCase() };
    });
  }, []);

  const deleteLetter = useCallback(() => {
    setState(prev => {
      if (prev.gameOver) return prev;
      return { ...prev, currentGuess: prev.currentGuess.slice(0, -1) };
    });
  }, []);

  const submitGuess = useCallback(() => {
    setState(prev => {
      if (prev.gameOver) return prev;

      if (prev.currentGuess.length !== 5) {
        const msg = language === 'de' ? 'Nicht genug Buchstaben' : 'Not enough letters';
        setTimeout(() => flashMessage(msg), 0);
        return { ...prev, shake: true };
      }

      const validWords = language === 'de' ? VALID_WORDS_DE : VALID_WORDS_EN;
      if (!validWords.has(prev.currentGuess)) {
        const msg = language === 'de' ? 'Kein gültiges Wort' : 'Not in word list';
        setTimeout(() => flashMessage(msg), 0);
        return { ...prev, shake: true };
      }

      const evaluation = evaluateGuess(prev.currentGuess, prev.solution);
      const newLetterStatuses = { ...prev.letterStatuses };

      for (let i = 0; i < 5; i++) {
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
      const isLastRow = prev.currentRow === 5;
      const gameOver = won || isLastRow;

      if (won) {
        const msgs = language === 'de'
          ? ['Genial!', 'Großartig!', 'Sehr gut!', 'Gut!', 'Knapp!', 'Gerade noch!']
          : ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Close!', 'Phew!'];
        setTimeout(() => flashMessage(msgs[prev.currentRow], true), 1600);
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
  }, [language, flashMessage]);

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
  };
}

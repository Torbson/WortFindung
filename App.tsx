import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Board } from './src/components/Board';
import { Keyboard } from './src/components/Keyboard';
import { useWortFindung, Language, WordLength, GAME_ROWS } from './src/hooks/useWortFindung';
import { evaluateGuess, TileStatus } from './src/utils/gameLogic';
import { COLORS, TEXT } from './src/styles/theme';
import { styles } from './src/styles/styles';
import { getWebGlobalCss, WEB_VIEWPORT_META } from './src/styles/web';

const WORD_LENGTHS: WordLength[] = [4, 5, 6, 7, 8];
const LANGUAGES: { key: Language; label: string }[] = [
  { key: 'de', label: 'Deutsch' },
  { key: 'en', label: 'English' },
];

const SHARE_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
const COPY_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
const GEAR_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;

function SvgIcon({ svg, size }: { svg: string; size: number }) {
  if (Platform.OS === 'web') {
    return React.createElement('div', {
      style: { width: size, height: size },
      dangerouslySetInnerHTML: { __html: svg },
    });
  }
  return <Text style={[{ fontSize: size, color: COLORS.white }, TEXT.bold]}>*</Text>;
}

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </Pressable>
  );
}

function loadSetting(key: string, fallback: boolean): boolean {
  if (Platform.OS !== 'web') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === 'true';
  } catch { return fallback; }
}

function saveSetting(key: string, value: boolean) {
  if (Platform.OS !== 'web') return;
  try { localStorage.setItem(key, String(value)); } catch { /* ignore */ }
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function useTimer(startedAt: number | null, solvedAt: number | null, enabled: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled || !startedAt) {
      setElapsed(0);
      return;
    }

    if (solvedAt) {
      setElapsed(Math.floor((solvedAt - startedAt) / 1000));
      return;
    }

    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, solvedAt, enabled]);

  return elapsed;
}

interface SharedData {
  lang: Language;
  wordLength: WordLength;
  date: string;
  guesses: string[];
  duration: number | null;
}

function parseUrlParams(): { lang?: Language; wordLength?: WordLength; date?: string; shared?: SharedData } {
  if (Platform.OS !== 'web') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const l = params.get('l');
    const n = params.get('n');
    const d = params.get('d');
    const g = params.get('g');
    const t = params.get('t');

    const lang = (l === 'de' || l === 'en') ? l : undefined;
    const wordLength = n ? parseInt(n, 10) as WordLength : undefined;
    const validLengths = [4, 5, 6, 7, 8];
    const wl = wordLength && validLengths.includes(wordLength) ? wordLength : undefined;
    const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;

    if (g && lang && wl && date) {
      const guesses = g.split(',').map(w => decodeURIComponent(w).toUpperCase());
      const duration = t ? parseInt(t, 10) : null;
      return { lang, wordLength: wl, date, shared: { lang, wordLength: wl, date, guesses, duration } };
    }

    return { lang, wordLength: wl, date };
  } catch {
    return {};
  }
}

function clearUrlParams() {
  if (Platform.OS !== 'web') return;
  try {
    window.history.replaceState({}, '', window.location.pathname);
  } catch { /* ignore */ }
}

function buildShareUrl(lang: Language, wordLength: WordLength, date: string, guesses?: string[], duration?: number | null): string {
  const base = Platform.OS === 'web'
    ? window.location.origin + window.location.pathname
    : 'https://wortfindung.app';
  const params = new URLSearchParams();
  params.set('l', lang);
  params.set('n', String(wordLength));
  params.set('d', date);
  if (guesses && guesses.length > 0) {
    params.set('g', guesses.map(w => encodeURIComponent(w)).join(','));
  }
  if (duration != null && duration > 0) {
    params.set('t', String(duration));
  }
  return `${base}?${params.toString()}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const WIN_MESSAGES: Record<Language, string[]> = {
  de: ['Genial!', 'Großartig!', 'Sehr gut!', 'Gut!', 'Knapp!', 'Gerade noch!', 'Puh!', 'Wow!', 'Geschafft!'],
  en: ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Close!', 'Phew!', 'Wow!', 'Made it!'],
};

/** Meldung aus dem Brett: komplett grüne Zeile → Gewinn; sonst bei Spielende die Lösung. Bleibt nach Reload (evaluations aus Speicher). */
function resultMessageFromBoard(
  evaluations: TileStatus[][],
  gameOver: boolean,
  solution: string,
  language: Language,
): string {
  if (!evaluations.length) return '';
  const last = evaluations[evaluations.length - 1];
  const allGreen = last.length > 0 && last.every((s) => s === 'correct');
  if (allGreen) {
    const msgs = WIN_MESSAGES[language];
    const rowIdx = evaluations.length - 1;
    return msgs[Math.min(rowIdx, msgs.length - 1)];
  }
  if (gameOver) return solution;
  return '';
}

const TILE_EMOJIS: Record<string, string> = {
  correct: '\u{1F7E9}',
  present: '\u{1F7E8}',
  absent: '\u{2B1B}',
};

function buildEmojiGrid(guesses: string[], solution: string): string {
  return guesses.map(g => {
    const eval_ = evaluateGuess(g, solution);
    return eval_.map(s => TILE_EMOJIS[s] ?? '\u{2B1B}').join('');
  }).join('\n');
}

async function shareOrCopy(url: string, text?: string) {
  if (Platform.OS !== 'web') return false;
  const fullText = text ? `${text}\n${url}` : url;
  if (navigator.share) {
    try {
      await navigator.share({ text: fullText });
      return true;
    } catch { /* user cancelled or not supported */ }
  }
  try {
    await navigator.clipboard.writeText(fullText);
    return true;
  } catch { /* clipboard not available */ }
  return false;
}

function useWebSetup() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', WEB_VIEWPORT_META);
    }

    const style = document.createElement('style');
    style.textContent = getWebGlobalCss();
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

function SharedResultView({ data, onClose }: { data: SharedData; onClose: () => void }) {
  const { guesses, wordLength, lang, duration, date } = data;
  const solutions = require('./src/data/wordsDE').SOLUTIONS_DE;
  const solutionsEN = require('./src/data/wordsEN').SOLUTIONS_EN;
  const allSolutions = lang === 'de' ? solutions : solutionsEN;
  const wordList = allSolutions[wordLength] ?? [];

  const getDailyWordForDate = (words: string[], dateKey: string) => {
    const [y, m, d_] = dateKey.split('-').map(Number);
    const noonUtc = Date.UTC(y, m - 1, d_, 12, 0, 0);
    const timestamp = Math.floor(noonUtc / 1000);
    let hash = 5381;
    const str = timestamp.toString();
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return words[Math.abs(hash) % words.length];
  };

  const solution = getDailyWordForDate(wordList, date);
  const maxGuesses = GAME_ROWS[wordLength];
  const won = guesses.length > 0 && guesses[guesses.length - 1] === solution;
  const evals = guesses.map(g => evaluateGuess(g, solution));

  const STATUS_COLORS_MAP: Record<string, string> = {
    correct: COLORS.correct,
    present: COLORS.present,
    absent: COLORS.absent,
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.settingsPanel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.settingsTitle}>
            {won ? (lang === 'de' ? 'Gelöst!' : 'Solved!') : (lang === 'de' ? 'Geteiltes Ergebnis' : 'Shared Result')}
          </Text>

          <Text style={styles.sharedSubtitle}>
            WortFindung {date} · {lang.toUpperCase()} · {wordLength} {lang === 'de' ? 'Buchstaben' : 'letters'}
          </Text>

          <Text style={styles.sharedScore}>
            {won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}
            {duration != null && duration > 0 ? ` · ${formatDuration(duration)}` : ''}
          </Text>

          <View style={styles.sharedGrid}>
            {evals.map((row, ri) => (
              <View key={ri} style={styles.sharedRow}>
                {row.map((status: TileStatus, ci: number) => (
                  <View
                    key={ci}
                    style={[
                      styles.sharedTile,
                      { backgroundColor: STATUS_COLORS_MAP[status] ?? COLORS.absent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sharedTileLetter,
                        status === 'absent' && styles.sharedTileLetterAbsent,
                      ]}
                    >
                      {guesses[ri][ci]}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>
              {lang === 'de' ? 'Selbst spielen' : 'Play it yourself'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function App() {
  const urlParams = useMemo(() => parseUrlParams(), []);
  const [language, setLanguage] = useState<Language>(urlParams.lang ?? 'de');
  const [wordLength, setWordLength] = useState<WordLength>(urlParams.wordLength ?? 5);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [sharedData, setSharedData] = useState<SharedData | null>(urlParams.shared ?? null);
  const [showTimer, setShowTimer] = useState(() => loadSetting('wortfindung-timer', false));

  const dateOverride = urlParams.date;
  const game = useWortFindung(language, wordLength, dateOverride);
  const timerElapsed = useTimer(game.startedAt, game.solvedAt, showTimer);
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;

  const resultBannerMessage = useMemo(
    () =>
      resultMessageFromBoard(game.evaluations, game.gameOver, game.solution, language),
    [game.evaluations, game.gameOver, game.solution, language],
  );

  const winRowIndex = game.gameWon && game.guesses.length > 0 ? game.guesses.length - 1 : -1;
  const prevGameWonRef = useRef<boolean | null>(null);
  const [winReplayNonce, setWinReplayNonce] = useState(0);

  useEffect(() => {
    if (prevGameWonRef.current === null) {
      prevGameWonRef.current = game.gameWon;
      return;
    }
    if (game.gameWon && !prevGameWonRef.current) {
      setWinReplayNonce((n) => n + 1);
    }
    prevGameWonRef.current = game.gameWon;
  }, [game.gameWon]);

  useWebSetup();

  useEffect(() => {
    if (urlParams.shared || urlParams.lang || urlParams.wordLength) {
      clearUrlParams();
    }
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
    setShareOpen(false);
  }, []);

  const toggleTimer = useCallback(() => {
    setShowTimer((prev) => {
      const next = !prev;
      saveSetting('wortfindung-timer', next);
      return next;
    });
  }, []);

  const toggleShare = useCallback(() => {
    setShareOpen((prev) => !prev);
    setSettingsOpen(false);
  }, []);

  const handleShare = useCallback(async (withGuesses: boolean) => {
    const url = buildShareUrl(
      language,
      wordLength,
      game.dateKey,
      withGuesses ? game.guesses : undefined,
      withGuesses ? game.durationSeconds : undefined,
    );

    let text: string | undefined;
    if (withGuesses && game.guesses.length > 0) {
      const maxG = GAME_ROWS[wordLength];
      const won = game.gameWon;
      const score = won ? `${game.guesses.length}/${maxG}` : `X/${maxG}`;
      const emoji = buildEmojiGrid(game.guesses, game.solution);
      const dur = game.durationSeconds != null && game.durationSeconds > 0
        ? ` · ${formatDuration(game.durationSeconds)}`
        : '';
      text = `WortFindung ${game.dateKey} · ${language.toUpperCase()} · ${wordLength}\n${score}${dur}\n\n${emoji}`;
    }

    const ok = await shareOrCopy(url, text);
    setShareOpen(false);
    if (ok) {
      setShareToast(language === 'de' ? 'Link kopiert!' : 'Link copied!');
      setTimeout(() => setShareToast(''), 2000);
    }
  }, [language, wordLength, game.dateKey, game.guesses, game.gameWon, game.solution, game.durationSeconds]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (shareOpen) { setShareOpen(false); return; }
        if (sharedData) { setSharedData(null); return; }
        return;
      }

      if (settingsOpen || shareOpen || sharedData) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        game.submitGuess();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        game.deleteLetter();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        game.moveSelection(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        game.moveSelection(1);
      } else {
        const key = e.key.toUpperCase();
        const validLetters = language === 'de'
          ? /^[A-ZÄÖÜ]$/
          : /^[A-Z]$/;
        if (validLetters.test(key)) {
          game.addLetter(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.submitGuess, game.deleteLetter, game.addLetter, game.moveSelection, language, settingsOpen, shareOpen, sharedData]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text
          style={[styles.title, isNarrow && styles.titleSmall]}
          numberOfLines={1}
        >
          WortFindung
        </Text>
        <View style={styles.headerIcons}>
          <Pressable
            onPress={toggleShare}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <SvgIcon svg={SHARE_SVG} size={isNarrow ? 20 : 22} />
          </Pressable>
          <Pressable
            onPress={toggleSettings}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <SvgIcon svg={GEAR_SVG} size={isNarrow ? 20 : 22} />
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      {settingsOpen && (
        <Modal transparent animationType="fade" visible onRequestClose={toggleSettings}>
          <Pressable style={styles.overlay} onPress={toggleSettings}>
            <Pressable style={styles.settingsPanel} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.settingsTitle}>Einstellungen</Text>

              <Text style={styles.settingsLabel}>Sprache</Text>
              <View style={styles.optionRow}>
                {LANGUAGES.map(({ key, label }) => (
                  <Pressable
                    key={key}
                    onPress={() => setLanguage(key)}
                    style={[styles.optionBtn, language === key && styles.optionBtnActive]}
                  >
                    <Text style={[styles.optionText, language === key && styles.optionTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.settingsLabel}>Buchstabenlänge</Text>
              <View style={styles.optionRow}>
                {WORD_LENGTHS.map((len) => (
                  <Pressable
                    key={len}
                    onPress={() => setWordLength(len)}
                    style={[styles.optionBtn, wordLength === len && styles.optionBtnActive]}
                  >
                    <Text style={[styles.optionText, wordLength === len && styles.optionTextActive]}>
                      {len}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.settingsLabel}>Timer</Text>
                <Toggle value={showTimer} onToggle={toggleTimer} />
              </View>

              <Pressable onPress={toggleSettings} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Fertig</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {shareOpen && (
        <Modal transparent animationType="fade" visible onRequestClose={toggleShare}>
          <Pressable style={styles.overlay} onPress={toggleShare}>
            <Pressable style={styles.settingsPanel} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.settingsTitle}>Teilen</Text>

              <Text style={styles.shareDesc}>
                {language === 'de'
                  ? 'Link zum heutigen Rätsel — ohne Lösung'
                  : 'Link to today\'s puzzle — no spoilers'}
              </Text>
              <Pressable
                onPress={() => handleShare(false)}
                style={({ pressed }) => [styles.shareOption, pressed && styles.shareOptionPressed]}
              >
                <SvgIcon svg={COPY_SVG} size={18} />
                <Text style={styles.shareOptionTitle}>
                  {language === 'de' ? 'Puzzle teilen' : 'Share puzzle'}
                </Text>
              </Pressable>

              <Text style={[styles.shareDesc, !game.guesses.length && styles.shareDescDisabled]}>
                {language === 'de'
                  ? game.gameOver
                    ? 'Link mit deiner Lösung und Dauer'
                    : 'Link mit deinem bisherigen Stand'
                  : game.gameOver
                    ? 'Link with your solution and time'
                    : 'Link with your progress so far'}
              </Text>
              <Pressable
                onPress={() => handleShare(true)}
                style={({ pressed }) => [
                  styles.shareOption,
                  !game.guesses.length && styles.shareOptionDisabled,
                  pressed && !(!game.guesses.length) && styles.shareOptionPressed,
                ]}
                disabled={!game.guesses.length}
              >
                <SvgIcon svg={COPY_SVG} size={18} />
                <Text style={[styles.shareOptionTitle, !game.guesses.length && styles.shareOptionDisabledText]}>
                  {language === 'de' ? 'Ergebnis teilen' : 'Share result'}
                </Text>
              </Pressable>

              <Pressable onPress={toggleShare} style={[styles.closeBtn, { marginTop: 16 }]}>
                <Text style={styles.closeBtnText}>
                  {language === 'de' ? 'Abbrechen' : 'Cancel'}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {sharedData && (
        <SharedResultView data={sharedData} onClose={() => setSharedData(null)} />
      )}

      <View style={styles.content}>
        {(resultBannerMessage || shareToast || game.message) ? (
          <View style={styles.messageBanner}>
            <Text style={styles.messageText}>
              {shareToast || resultBannerMessage || game.message}
            </Text>
          </View>
        ) : null}
        <Board
          guesses={game.guesses}
          evaluations={game.evaluations}
          currentGuess={game.currentGuess}
          currentRow={game.currentRow}
          selectedCell={game.selectedCell}
          popCell={game.popCell}
          shake={game.shake}
          revealRow={game.revealRow}
          rows={game.rows}
          cols={game.cols}
          onSelectCell={game.selectCell}
          pinGridTop={Boolean(resultBannerMessage || shareToast || game.message)}
          gameWon={game.gameWon}
          winRowIndex={winRowIndex}
          winReplayNonce={winReplayNonce}
        />

        <View style={styles.bottom}>
          {showTimer && (
            <View style={styles.timerRow}>
              <Text style={styles.timerText}>{formatTimer(timerElapsed)}</Text>
            </View>
          )}
          <Keyboard
            onKeyPress={game.addLetter}
            onEnter={game.submitGuess}
            onDelete={game.deleteLetter}
            letterStatuses={game.letterStatuses}
            language={language}
          />
        </View>
      </View>
    </View>
  );
}

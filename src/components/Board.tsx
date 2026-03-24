import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { Tile } from './Tile';
import { TileStatus } from '../utils/gameLogic';

interface BoardProps {
  guesses: string[];
  evaluations: TileStatus[][];
  currentGuess: string[];
  currentRow: number;
  selectedCell: number;
  popCell: number;
  shake: boolean;
  revealRow: number;
  rows: number;
  cols: number;
  onSelectCell: (index: number) => void;
  /** Meldung oben: Raster oben ausrichten statt vertikal zu zentrieren (engerer Abstand zur Zeile) */
  pinGridTop?: boolean;
  gameWon?: boolean;
  /** Index der grünen Gewinnzeile, oder -1 */
  winRowIndex?: number;
  /** Erhöht sich beim Übergang zu gameWon → Replay-Animation für Zeilen oberhalb der grünen Reihe */
  winReplayNonce?: number;
}

const REFERENCE_COLS = 5;
const REFERENCE_ROWS = 6;
const REFERENCE_MAX_TILE = 62;
const TILE_GAP = 5;
/** Verzögerung zwischen Spalten: Welle von links nach rechts (langsamer = deutlichere Welle) */
const REVEAL_STAGGER_MS = 480;
const REVEAL_DURATION_MS = 900;
const CELEBRATION_GAP_MS = 280;

/**
 * Ende der Drehung der **Gewinnzeile**: dort ist das Delay nur `col * STAGGER` (nicht `winRow * cols * …`),
 * alle Kacheln starten beim gleichen Submit.
 */
function winningRowLastTileRevealEndMs(cols: number): number {
  return (cols - 1) * REVEAL_STAGGER_MS + REVEAL_DURATION_MS;
}

export const Board: React.FC<BoardProps> = ({
  guesses,
  evaluations,
  currentGuess,
  currentRow,
  selectedCell,
  popCell,
  shake,
  rows,
  cols,
  onSelectCell,
  pinGridTop,
  gameWon = false,
  winRowIndex = -1,
  winReplayNonce = 0,
}) => {
  const { width, height } = useWindowDimensions();
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  /** Jubel unten erst, wenn die Gewinnzeile fertig gedreht hat (vermeidet sofortige Umstellung) */
  const [belowCelebrationVisible, setBelowCelebrationVisible] = React.useState(false);

  React.useEffect(() => {
    if (!gameWon || winRowIndex < 0) {
      setBelowCelebrationVisible(false);
      return;
    }
    const ms = winningRowLastTileRevealEndMs(cols) + CELEBRATION_GAP_MS;
    const id = setTimeout(() => setBelowCelebrationVisible(true), ms);
    return () => clearTimeout(id);
  }, [gameWon, winRowIndex, cols]);

  const scaleFactor = Math.sqrt(
    (REFERENCE_COLS * REFERENCE_ROWS) / (cols * rows),
  );
  const maxTile = Math.floor(REFERENCE_MAX_TILE * scaleFactor);

  const boardPad = 16;
  const maxByWidth = (width - boardPad * 2 - TILE_GAP * (cols - 1)) / cols;
  const headerAndKeyboard = 280;
  const maxByHeight = (height - headerAndKeyboard - TILE_GAP * (rows - 1)) / rows;
  const tileSize = Math.min(maxTile, maxByWidth, maxByHeight);

  React.useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [shake, shakeAnim]);

  const renderRow = (rowIndex: number) => {
    const isCurrentRow = rowIndex === currentRow;
    const isGuessedRow = rowIndex < guesses.length;

    const tiles = [];
    for (let col = 0; col < cols; col++) {
      let letter = '';
      let status: TileStatus = 'empty';
      let pop = false;
      let selected = false;
      let delay = col * REVEAL_STAGGER_MS;
      let winReplayRole: 'none' | 'above' | 'below' = 'none';
      let celebrationSeed: number | undefined;

      if (
        gameWon &&
        winRowIndex >= 0 &&
        rowIndex > winRowIndex &&
        belowCelebrationVisible
      ) {
        letter = '';
        status = 'empty';
        winReplayRole = 'below';
        const seed = rowIndex * 10007 + col * 10009 + winRowIndex * 13001;
        celebrationSeed = seed;
        const jitter = ((seed ^ (seed >>> 7)) % 700 + 700) % 700;
        const scatter = (col * 47 + rowIndex * 83 + (seed & 255)) % 320;
        /** Kein `belowCelebrationStartMs` mehr: sichtbar erst nach Timer, nur leichte Staffelung */
        delay = jitter + scatter;
      } else if (isGuessedRow) {
        letter = guesses[rowIndex][col];
        status = evaluations[rowIndex][col];
        if (gameWon && winRowIndex >= 0 && rowIndex < winRowIndex) {
          winReplayRole = 'above';
          delay = rowIndex * cols * REVEAL_STAGGER_MS + col * REVEAL_STAGGER_MS;
        }
      } else if (isCurrentRow && !(gameWon && winRowIndex >= 0 && rowIndex > winRowIndex)) {
        letter = currentGuess[col] || '';
        status = letter ? 'tbd' : 'empty';
        pop = col === popCell;
        selected = col === selectedCell;
      }

      tiles.push(
        <Tile
          key={`${rowIndex}-${col}`}
          letter={letter}
          status={status}
          delay={delay}
          pop={pop}
          size={tileSize}
          selected={selected}
          onPress={
            isCurrentRow && !(gameWon && rowIndex > winRowIndex)
              ? () => onSelectCell(col)
              : undefined
          }
          winReplayNonce={winReplayNonce}
          winReplayRole={winReplayRole}
          celebrationSeed={celebrationSeed}
        />,
      );
    }

    const rowContent = <View style={styles.row}>{tiles}</View>;

    if (isCurrentRow) {
      return (
        <Animated.View
          key={rowIndex}
          style={{ transform: [{ translateX: shakeAnim }] }}
        >
          {rowContent}
        </Animated.View>
      );
    }

    return <View key={rowIndex}>{rowContent}</View>;
  };

  return (
    <View style={[styles.board, pinGridTop && styles.boardPinTop]}>
      {Array.from({ length: rows }, (_, i) => renderRow(i))}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  boardPinTop: {
    justifyContent: 'flex-start',
  },
  row: {
    flexDirection: 'row',
  },
});

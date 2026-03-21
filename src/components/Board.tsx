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
}

const REFERENCE_COLS = 5;
const REFERENCE_ROWS = 6;
const REFERENCE_MAX_TILE = 62;
const TILE_GAP = 5;

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
}) => {
  const { width, height } = useWindowDimensions();
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

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

      if (isGuessedRow) {
        letter = guesses[rowIndex][col];
        status = evaluations[rowIndex][col];
      } else if (isCurrentRow) {
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
          delay={col * 300}
          pop={pop}
          size={tileSize}
          selected={selected}
          onPress={isCurrentRow ? () => onSelectCell(col) : undefined}
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
    <View style={styles.board}>
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
  row: {
    flexDirection: 'row',
  },
});

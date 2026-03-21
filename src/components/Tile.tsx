import React, { useEffect, useRef } from 'react';
import { Text, Pressable, StyleSheet, Animated } from 'react-native';
import { TileStatus } from '../utils/gameLogic';
import { COLORS } from '../styles/theme';

interface TileProps {
  letter: string;
  status: TileStatus;
  delay: number;
  pop: boolean;
  size: number;
  selected?: boolean;
  onPress?: () => void;
}

const STATUS_COLORS: Record<TileStatus, string> = {
  correct: COLORS.correct,
  present: COLORS.present,
  absent: COLORS.absent,
  empty: 'transparent',
  tbd: 'transparent',
};

export const Tile: React.FC<TileProps> = ({ letter, status, delay, pop, size, selected, onPress }) => {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(1)).current;
  const revealed = useRef(false);

  useEffect(() => {
    if (status !== 'empty' && status !== 'tbd' && !revealed.current) {
      revealed.current = true;
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, [status, delay, flipAnim]);

  useEffect(() => {
    if (pop && letter) {
      popAnim.setValue(0.8);
      Animated.spring(popAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }
  }, [pop, letter, popAnim]);

  const isRevealed = status !== 'empty' && status !== 'tbd';

  const rotateX = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  const bgColor = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [
      'transparent',
      'transparent',
      STATUS_COLORS[status] || 'transparent',
      STATUS_COLORS[status] || 'transparent',
    ],
  });

  const borderColor = selected
    ? '#787878'
    : isRevealed
      ? STATUS_COLORS[status]
      : COLORS.tileBorder;

  const fontSize = Math.max(14, size * 0.48);

  const tileView = (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderColor,
          transform: [
            { perspective: 400 },
            { rotateX: isRevealed ? rotateX : '0deg' },
            { scale: popAnim },
          ],
          backgroundColor: isRevealed ? bgColor as any : 'transparent',
        },
        selected && styles.selectedTile,
      ]}
    >
      <Text style={[styles.letter, { fontSize }]}>{letter}</Text>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {tileView}
      </Pressable>
    );
  }

  return tileView;
};

const styles = StyleSheet.create({
  tile: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2.5,
  },
  selectedTile: {
    boxShadow: '0 0 10px rgba(150, 150, 150, 0.7)',
  } as any,
  pressable: {
    outlineStyle: 'none',
  } as any,
  letter: {
    color: COLORS.tileText,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

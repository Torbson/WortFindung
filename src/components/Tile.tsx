import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, Pressable, StyleSheet, Animated } from 'react-native';
import { TileStatus } from '../utils/gameLogic';
import { COLORS, TEXT } from '../styles/theme';

interface TileProps {
  letter: string;
  status: TileStatus;
  delay: number;
  pop: boolean;
  size: number;
  selected?: boolean;
  onPress?: () => void;
  /** Sieg: Zeilen oberhalb der grünen Reihe erneut drehen */
  winReplayNonce?: number;
  winReplayRole?: 'none' | 'above' | 'below';
  /** Sieg: untere Jubel-Kacheln – zufällige Drehung & Farben (deterministisch pro Seed) */
  celebrationSeed?: number;
}

const CELEBRATION_STATUSES: TileStatus[] = ['correct', 'present', 'absent'];

/** Deterministischer Zufall pro Kachel (stabile Animation bei Re-Renders) */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 0x9e3779b9) + 0x517cc1b7) >>> 0;
    return s / 0x100000000;
  };
}

const STATUS_COLORS: Record<TileStatus, string> = {
  correct: COLORS.correct,
  present: COLORS.present,
  absent: COLORS.absent,
  empty: 'transparent',
  tbd: 'transparent',
};

/** Eine Kachel-Umdrehung (horizontal); Stagger kommt über `delay` aus dem Board */
const REVEAL_DURATION_MS = 900;

export const Tile: React.FC<TileProps> = ({
  letter,
  status,
  delay,
  pop,
  size,
  selected,
  onPress,
  winReplayNonce = 0,
  winReplayRole = 'none',
  celebrationSeed,
}) => {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const celebrationSpin = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(1)).current;
  const revealed = useRef(false);
  const [celebrationColor, setCelebrationColor] = useState<string | null>(null);

  const isBelowCelebration = winReplayRole === 'below';

  const celebrationConfig = useMemo(() => {
    if (!isBelowCelebration || celebrationSeed === undefined) return null;
    const rnd = seededRandom(celebrationSeed);
    const totalDeg = 360 * (2 + Math.floor(rnd() * 4));
    const duration = 1200 + Math.floor(rnd() * 2000);
    const segments = 12 + Math.floor(rnd() * 18);
    /** `null` = grauer Rand an dieser Kantenmitte (90°+k·180°), nie per setState außerhalb */
    const palette: (TileStatus | null)[] = [];
    for (let i = 0; i < segments; i++) {
      const r = rnd();
      if (r < 0.38) palette.push(null);
      else palette.push(CELEBRATION_STATUSES[Math.floor(rnd() * 3)]);
    }
    return { totalDeg, duration, segments, palette };
  }, [isBelowCelebration, celebrationSeed]);

  const rotateYCelebration = useMemo(() => {
    if (!celebrationConfig) return null;
    return celebrationSpin.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${celebrationConfig.totalDeg}deg`],
    });
  }, [celebrationConfig, celebrationSpin]);

  useEffect(() => {
    if (status !== 'empty' && status !== 'tbd' && !revealed.current && !isBelowCelebration) {
      revealed.current = true;
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: REVEAL_DURATION_MS,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, [status, delay, flipAnim, isBelowCelebration]);

  useEffect(() => {
    if (!isBelowCelebration || celebrationSeed === undefined || !celebrationConfig) return;

    const { duration, totalDeg, palette } = celebrationConfig;
    const cancelledRef = { current: false };

    /**
     * Nur an Kantenmitten (90°+k·180°) Farbe oder Grau setzen — alles aus maxDSeen abgeleitet,
     * kein Snap zu Grau bei Zyklusstart / Pause / value=0.
     */
    let lastMidIdx = -1;
    let maxDSeen = 0;
    const id = celebrationSpin.addListener(({ value }) => {
      if (value <= 0) {
        lastMidIdx = -1;
        maxDSeen = 0;
        return;
      }
      const d = value * totalDeg;
      maxDSeen = Math.max(maxDSeen, d);
      const midIdx = maxDSeen < 90 ? -1 : Math.floor((maxDSeen - 90) / 180);
      if (midIdx === lastMidIdx) return;
      if (midIdx < 0) return;
      lastMidIdx = midIdx;
      const slot = palette[midIdx % palette.length];
      setCelebrationColor(slot === null ? null : STATUS_COLORS[slot]);
    });

    let iter = 0;
    /** Pause mit „stillstehender“ Kachel nach jeder vollen Drehung, bevor der nächste Zyklus startet */
    const REST_BETWEEN_MS = 5000;
    let restTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const runCycle = () => {
      if (cancelledRef.current) return;
      lastMidIdx = -1;
      maxDSeen = 0;
      celebrationSpin.setValue(0);

      const anim = Animated.timing(celebrationSpin, {
        toValue: 1,
        duration,
        delay: iter === 0 ? delay : 0,
        useNativeDriver: true,
      });
      iter += 1;

      anim.start(({ finished }) => {
        if (cancelledRef.current) return;
        if (finished) {
          restTimeoutId = setTimeout(() => {
            restTimeoutId = null;
            if (!cancelledRef.current) runCycle();
          }, REST_BETWEEN_MS);
        }
      });
    };

    runCycle();

    return () => {
      cancelledRef.current = true;
      if (restTimeoutId) clearTimeout(restTimeoutId);
      celebrationSpin.stopAnimation();
      celebrationSpin.removeListener(id);
    };
  }, [isBelowCelebration, celebrationSeed, celebrationConfig, delay, celebrationSpin]);

  useEffect(() => {
    if (winReplayRole !== 'above' || !winReplayNonce) return;
    revealed.current = false;
    flipAnim.setValue(0);
    const anim = Animated.timing(flipAnim, {
      toValue: 1,
      duration: REVEAL_DURATION_MS,
      delay,
      useNativeDriver: true,
    });
    anim.start(() => {
      revealed.current = true;
    });
    return () => anim.stop();
  }, [winReplayNonce, winReplayRole, delay, flipAnim]);

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

  /** Horizontal um die Y-Achse; Welle von links nach rechts über gestaffeltes `delay` im Board */
  const rotateY = flipAnim.interpolate({
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
    : isBelowCelebration && celebrationColor
      ? celebrationColor
      : isRevealed
        ? STATUS_COLORS[status]
        : COLORS.tileBorder;

  const bgSolid = isBelowCelebration && celebrationColor ? celebrationColor : undefined;

  const fontSize = Math.max(15, size * 0.52);

  const tileView = (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderColor,
          transform: [
            { perspective: 800 },
            isBelowCelebration && rotateYCelebration
              ? { rotateY: rotateYCelebration }
              : { rotateY: isRevealed ? rotateY : '0deg' },
            { scale: popAnim },
          ],
          backgroundColor:
            isBelowCelebration && bgSolid
              ? (bgSolid as any)
              : isRevealed
                ? (bgColor as any)
                : 'transparent',
        },
        selected && styles.selectedTile,
      ]}
    >
      <Text
        style={[
          styles.letter,
          { fontSize },
          isRevealed && status === 'absent' && styles.letterAbsent,
        ]}
      >
        {letter}
      </Text>
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
    borderRadius: 8,
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
    ...TEXT.bold,
    color: COLORS.tileText,
    textTransform: 'uppercase',
  },
  letterAbsent: {
    ...TEXT.bold,
    color: COLORS.absentMuted,
    textDecorationLine: 'line-through',
    textDecorationColor: COLORS.absentMuted,
  } as any,
});

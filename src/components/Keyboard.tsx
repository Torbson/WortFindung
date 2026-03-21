import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS, KEYBOARD_LAYOUTS } from '../styles/theme';
import type { Language, LetterStatus } from '../hooks/useWordle';

interface KeyboardProps {
  onKeyPress: (letter: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  letterStatuses: Record<string, LetterStatus>;
  language: Language;
}

const STATUS_KEY_COLORS: Record<string, string> = {
  correct: COLORS.correct,
  present: COLORS.present,
  absent: COLORS.absent,
};

export const Keyboard: React.FC<KeyboardProps> = ({
  onKeyPress,
  onEnter,
  onDelete,
  letterStatuses,
  language,
}) => {
  const layout = KEYBOARD_LAYOUTS[language];
  const { width } = useWindowDimensions();

  const kbWidth = Math.min(width - 8, 520);
  const maxKeysInRow = Math.max(...layout.map(r => r.length));
  const keyGap = width < 380 ? 3 : 5;
  const baseKeyWidth = (kbWidth - keyGap * (maxKeysInRow + 1)) / maxKeysInRow;
  const keyHeight = Math.min(58, Math.max(42, baseKeyWidth * 1.6));
  const fontSize = width < 380 ? 11 : 14;

  const handlePress = (key: string) => {
    if (key === 'ENTER') {
      onEnter();
    } else if (key === 'DEL') {
      onDelete();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <View style={[styles.keyboard, { maxWidth: kbWidth }]}>
      {layout.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap: keyGap }]}>
          {row.map((key) => {
            const isSpecial = key === 'ENTER' || key === 'DEL';
            const bgColor = !isSpecial && letterStatuses[key]
              ? STATUS_KEY_COLORS[letterStatuses[key]]
              : COLORS.keyBg;

            const keyW = isSpecial ? baseKeyWidth * 1.5 : baseKeyWidth;

            return (
              <Pressable
                key={key}
                onPress={() => handlePress(key)}
                style={({ pressed }) => [
                  styles.key,
                  {
                    width: keyW,
                    height: keyHeight,
                    backgroundColor: bgColor,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.keyText, { fontSize: isSpecial ? fontSize - 2 : fontSize }]}>
                  {key === 'DEL' ? '⌫' : key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  keyboard: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 3,
  },
  key: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    color: COLORS.keyText,
    fontWeight: '700',
  },
});

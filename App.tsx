import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Board } from './src/components/Board';
import { Keyboard } from './src/components/Keyboard';
import { useWortFindung, Language } from './src/hooks/useWortFindung';
import { COLORS } from './src/styles/theme';

function useWebSetup() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      );
    }

    const style = document.createElement('style');
    style.textContent = `
      html, body, #root {
        height: 100%;
        overflow: hidden;
        overscroll-behavior: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        background-color: ${COLORS.background};
      }
      body {
        padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        position: fixed;
        width: 100%;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
}

export default function App() {
  const [language, setLanguage] = useState<Language>('de');
  const game = useWortFindung(language);
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;

  useWebSetup();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        game.submitGuess();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        game.deleteLetter();
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
  }, [game.submitGuess, game.deleteLetter, game.addLetter, language]);

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
        <View style={styles.langSwitch}>
          <Pressable
            onPress={() => setLanguage('de')}
            style={[styles.langBtn, language === 'de' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, language === 'de' && styles.langTextActive]}>
              DE
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLanguage('en')}
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
              EN
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      {game.message ? (
        <View style={styles.messageBanner}>
          <Text style={styles.messageText}>{game.message}</Text>
        </View>
      ) : null}

      <View style={styles.content}>
        <Board
          guesses={game.guesses}
          evaluations={game.evaluations}
          currentGuess={game.currentGuess}
          currentRow={game.currentRow}
          shake={game.shake}
          revealRow={game.revealRow}
        />

        <View style={styles.bottom}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 1.5,
    flexShrink: 1,
  },
  titleSmall: {
    fontSize: 22,
    letterSpacing: 0.5,
  },
  langSwitch: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  langBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.headerBorder,
  },
  langBtnActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  langText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  langTextActive: {
    color: COLORS.background,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.headerBorder,
  },
  messageBanner: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 4,
    zIndex: 100,
    elevation: 5,
  },
  messageText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 4,
  },
});

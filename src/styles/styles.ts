import { StyleSheet } from 'react-native';
import { COLORS, TEXT } from './theme';

/**
 * Zentrale StyleSheet-Definitionen für {@link App} (Root-Screen, Modals, geteilte UI-Blöcke).
 * Komponenten-spezifische Styles bleiben in Tile.tsx / Keyboard.tsx / …
 */
export const styles = StyleSheet.create({
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
    ...TEXT.bold,
    color: COLORS.white,
    fontSize: 30,
    letterSpacing: 1.5,
    flexShrink: 1,
  },
  titleSmall: {
    fontSize: 22,
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.headerBorder,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
  },
  settingsPanel: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 24,
    width: '88%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.headerBorder,
  },
  settingsTitle: {
    ...TEXT.bold,
    color: COLORS.white,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  settingsLabel: {
    ...TEXT.semibold,
    color: '#999',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.headerBorder,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: COLORS.correct,
    borderColor: COLORS.correct,
  },
  optionText: {
    ...TEXT.semibold,
    color: '#aaa',
    fontSize: 14,
  },
  optionTextActive: {
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#555',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleTrackOn: {
    backgroundColor: COLORS.correct,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  closeBtn: {
    marginTop: 8,
    backgroundColor: COLORS.headerBorder,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeBtnText: {
    ...TEXT.bold,
    color: COLORS.white,
    fontSize: 15,
  },

  shareDesc: {
    ...TEXT.regular,
    color: '#999',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 4,
  },
  shareDescDisabled: {
    opacity: 0.4,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.headerBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  shareOptionTitle: {
    ...TEXT.bold,
    color: COLORS.white,
    fontSize: 15,
  },
  shareOptionPressed: {
    backgroundColor: '#3a3a3c',
    borderColor: '#555',
  },
  shareOptionDisabled: {
    opacity: 0.4,
  },
  shareOptionDisabledText: {
    color: '#666',
  },

  sharedSubtitle: {
    ...TEXT.regular,
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  sharedScore: {
    ...TEXT.bold,
    color: COLORS.white,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 16,
  },
  sharedGrid: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sharedRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  sharedTile: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedTileLetter: {
    ...TEXT.bold,
    color: COLORS.white,
    fontSize: 17,
  },
  sharedTileLetterAbsent: {
    ...TEXT.bold,
    color: COLORS.absentMuted,
    textDecorationLine: 'line-through',
    textDecorationColor: COLORS.absentMuted,
  } as any,

  messageBanner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  messageText: {
    ...TEXT.bold,
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
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
  timerRow: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  timerText: {
    ...TEXT.semibold,
    color: '#888',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});

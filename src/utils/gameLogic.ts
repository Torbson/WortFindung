export type TileStatus = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

export function evaluateGuess(guess: string, solution: string): TileStatus[] {
  const len = solution.length;
  const result: TileStatus[] = Array(len).fill('absent');
  const solutionChars = solution.split('');
  const guessChars = guess.split('');

  for (let i = 0; i < len; i++) {
    if (guessChars[i] === solutionChars[i]) {
      result[i] = 'correct';
      solutionChars[i] = '#';
      guessChars[i] = '*';
    }
  }

  for (let i = 0; i < len; i++) {
    if (guessChars[i] === '*') continue;
    const idx = solutionChars.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = 'present';
      solutionChars[idx] = '#';
    }
  }

  return result;
}

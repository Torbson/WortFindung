#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LENGTHS = [4, 5, 6, 7, 8];

function generateEN() {
  console.log('Loading English words...');
  const words = require('an-array-of-english-words');
  console.log(`  Loaded ${words.length} total English words`);

  const result = {};
  for (const len of LENGTHS) {
    const filtered = [...new Set(
      words
        .filter(w => w.length === len && /^[a-z]+$/.test(w))
        .map(w => w.toUpperCase())
    )].sort();
    result[len] = filtered;
    console.log(`  ${len}-letter: ${filtered.length} words`);
  }
  return result;
}

function generateDE() {
  console.log('Loading German words...');
  const words = require('all-the-german-words');
  console.log(`  Loaded ${words.length} total German words`);

  const result = {};
  for (const len of LENGTHS) {
    const filtered = [...new Set(
      words
        .filter(w => !w.includes('ß') && !w.includes('ẞ'))
        .map(w => w.toUpperCase())
        .filter(w => w.length === len && /^[A-ZÄÖÜ]+$/.test(w))
    )].sort();
    result[len] = filtered;
    console.log(`  ${len}-letter: ${filtered.length} words`);
  }
  return result;
}

function formatArray(arr) {
  const lines = [];
  for (let i = 0; i < arr.length; i += 10) {
    const chunk = arr.slice(i, i + 10);
    lines.push('    ' + chunk.map(w => `'${w}'`).join(',') + ',');
  }
  return lines.join('\n');
}

function writeFile(langWords, varName, outputPath) {
  const lines = [];

  lines.push(`export const ${varName}: Record<number, string[]> = {`);
  for (const len of LENGTHS) {
    lines.push(`  ${len}: [`);
    lines.push(formatArray(langWords[len]));
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');

  fs.writeFileSync(outputPath, lines.join('\n') + '\n');

  const totalWords = LENGTHS.reduce((sum, len) => sum + langWords[len].length, 0);
  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`  Wrote ${outputPath} (${totalWords} words, ${sizeKB} KB)`);
}

console.log('=== Word List Generator ===\n');

const enWords = generateEN();
console.log('');
const deWords = generateDE();
console.log('');

writeFile(enWords, 'WORDS_EN', path.join(__dirname, '../src/data/wordsEN.ts'));
writeFile(deWords, 'WORDS_DE', path.join(__dirname, '../src/data/wordsDE.ts'));

console.log('\nDone!');

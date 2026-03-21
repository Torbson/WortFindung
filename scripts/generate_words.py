#!/usr/bin/env python3
"""
Generate curated word lists for WortFindung.

English: Uses @skedwards88/word_lists (npm) — common vs uncommon, already curated.
German:  Solutions from Nordsword3m/German-Words (GitHub) — only lemmas (base forms).
         Valid guesses from all-the-german-words (npm) — comprehensive word list.

Output: src/data/wordsEN.ts and src/data/wordsDE.ts
        Each file exports SOLUTIONS (daily puzzle words) and VALID (accepted guesses).
"""

import json
import os
import re
import sys

LENGTHS = [4, 5, 6, 7, 8]

# Minimum frequency for German solution words (filters out rare/obscure words)
DE_SOLUTION_MIN_FREQ = 1e-05

# Words that should never appear as daily solutions (offensive, brand names, etc.)
DE_BLOCKLIST = {
    "JAPSE", "JUDEN", "NAZIS", "NEGER", "NUTTE", "FOTZE", "HURRA",
    "UNIX", "LINUX",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
NPM_WORD_LISTS = os.path.join(
    PROJECT_DIR, "node_modules", "@skedwards88", "word_lists", "compiled"
)
GERMAN_LEMMA_DATA = "/tmp/german-words-repo/data/all.json"
ALL_GERMAN_WORDS = os.path.join(
    PROJECT_DIR, "node_modules", "all-the-german-words", "woerter.json"
)


def load_english():
    """Load curated English word lists from @skedwards88/word_lists."""
    solutions = {}
    valid = {}

    for length in LENGTHS:
        if length == 8:
            common_file = os.path.join(NPM_WORD_LISTS, "commonWordsLen8plus.json")
            uncommon_file = os.path.join(NPM_WORD_LISTS, "uncommonWordsLen8plus.json")
        else:
            common_file = os.path.join(NPM_WORD_LISTS, f"commonWordsLen{length}.json")
            uncommon_file = os.path.join(
                NPM_WORD_LISTS, f"uncommonWordsLen{length}.json"
            )

        with open(common_file) as f:
            common = json.load(f)
        with open(uncommon_file) as f:
            uncommon = json.load(f)

        if length == 8:
            common = [w for w in common if len(w) == 8]
            uncommon = [w for w in uncommon if len(w) == 8]

        alpha_only = re.compile(r"^[A-Z]+$")
        common = sorted(set(w for w in common if alpha_only.match(w)))
        uncommon = sorted(set(w for w in uncommon if alpha_only.match(w)))

        solutions[length] = common
        valid[length] = sorted(set(common + uncommon))

        print(f"  EN {length}-letter: {len(common)} solutions, {len(valid[length])} valid")

    return solutions, valid


def load_german():
    """
    Solutions: Nordsword3m/German-Words lemmas (base forms only).
    Valid guesses: all-the-german-words (comprehensive, includes conjugations/plurals).
    """
    if not os.path.exists(GERMAN_LEMMA_DATA):
        print(f"ERROR: German lemma data not found at {GERMAN_LEMMA_DATA}")
        print("Run: git clone --depth 1 https://github.com/Nordsword3m/German-Words.git /tmp/german-words-repo")
        sys.exit(1)
    if not os.path.exists(ALL_GERMAN_WORDS):
        print(f"ERROR: all-the-german-words not found. Run: npm install")
        sys.exit(1)

    valid_chars = re.compile(r"^[A-ZÄÖÜ]+$")

    # --- Solutions: lemmas only ---
    print("  Loading German lemma data...")
    with open(GERMAN_LEMMA_DATA) as f:
        lemma_data = json.load(f)
    print(f"  Loaded {len(lemma_data)} lemma entries")

    solutions = {}
    for length in LENGTHS:
        words = set()
        for entry in lemma_data:
            lemma = entry.get("lemma", "").replace("·", "")
            upper = lemma.upper()
            freq = entry.get("frequency", 0)
            if len(upper) != length:
                continue
            if "ß" in lemma.lower():
                continue
            if not valid_chars.match(upper):
                continue
            if freq < DE_SOLUTION_MIN_FREQ:
                continue
            if upper in DE_BLOCKLIST:
                continue
            words.add(upper)
        solutions[length] = sorted(words)

    # --- Valid guesses: comprehensive list ---
    print("  Loading comprehensive German word list...")
    with open(ALL_GERMAN_WORDS) as f:
        all_words = json.load(f)
    print(f"  Loaded {len(all_words)} total German words")

    valid = {}
    for length in LENGTHS:
        words = set()
        for w in all_words:
            if "ß" in w:
                continue
            upper = w.upper()
            if len(upper) != length:
                continue
            if not valid_chars.match(upper):
                continue
            words.add(upper)
        words |= set(solutions[length])
        valid[length] = sorted(words)

    for length in LENGTHS:
        print(f"  DE {length}-letter: {len(solutions[length])} solutions, {len(valid[length])} valid")

    return solutions, valid


def format_array(words, indent=4):
    """Format a word list as TypeScript array content."""
    lines = []
    prefix = " " * indent
    for i in range(0, len(words), 10):
        chunk = words[i : i + 10]
        lines.append(prefix + ",".join(f"'{w}'" for w in chunk) + ",")
    return "\n".join(lines)


def write_ts_file(solutions, valid, var_prefix, output_path):
    """Write a TypeScript file with SOLUTIONS and VALID word lists."""
    parts = []

    parts.append(f"export const SOLUTIONS_{var_prefix}: Record<number, string[]> = {{")
    for length in LENGTHS:
        parts.append(f"  {length}: [")
        parts.append(format_array(solutions[length]))
        parts.append("  ],")
    parts.append("};")
    parts.append("")

    parts.append(f"export const VALID_{var_prefix}: Record<number, string[]> = {{")
    for length in LENGTHS:
        parts.append(f"  {length}: [")
        parts.append(format_array(valid[length]))
        parts.append("  ],")
    parts.append("};")
    parts.append("")

    content = "\n".join(parts) + "\n"
    with open(output_path, "w") as f:
        f.write(content)

    total_sol = sum(len(solutions[l]) for l in LENGTHS)
    total_val = sum(len(valid[l]) for l in LENGTHS)
    size_kb = os.path.getsize(output_path) / 1024
    print(f"  Wrote {output_path}")
    print(f"    {total_sol} solutions, {total_val} valid words, {size_kb:.1f} KB")


def main():
    print("=== WortFindung Word List Generator ===\n")

    print("English (from @skedwards88/word_lists):")
    en_solutions, en_valid = load_english()

    print("\nGerman (from Nordsword3m/German-Words lemmas):")
    de_solutions, de_valid = load_german()

    print("\nWriting TypeScript files...")
    en_path = os.path.join(PROJECT_DIR, "src", "data", "wordsEN.ts")
    de_path = os.path.join(PROJECT_DIR, "src", "data", "wordsDE.ts")

    write_ts_file(en_solutions, en_valid, "EN", en_path)
    write_ts_file(de_solutions, de_valid, "DE", de_path)

    print("\nDone!")


if __name__ == "__main__":
    main()

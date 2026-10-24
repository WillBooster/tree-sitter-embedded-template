import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

import { generationInputMtime } from '../helpers/generationInputs.js';

const Root = path.join(import.meta.dirname, '../..');
// The Wasm build is the one the package ships.
const WasmPath = path.join(Root, 'tree-sitter-embedded_template.wasm');
await Parser.init();
const parser = new Parser();
parser.setLanguage(await Language.load(WasmPath));

// The tests load the existing Wasm build, so a stale one would hide an edit that makes parsing slower than linear.
test('uses a Wasm build built from the current parser', () => {
  const sources = ['grammar.js', 'src/parser.c', 'src/tree_sitter/parser.h'].map(
    (name) => fs.statSync(path.join(Root, name)).mtimeMs
  );
  expect(
    Math.max(generationInputMtime(Root), ...sources) > fs.statSync(WasmPath).mtimeMs,
    'generation inputs or src/ changed after the Wasm build was built; run `bun run build/ci`'
  ).toBe(false);
});

// Consumers parse templates while they are being edited, when the last directive is often still open, so parsing such
// a template must stay linear: ten times the directives take about ten times as long, against a hundred times for a
// quadratic cost. The ratio catches a cost that grows faster than the input even on a slow CI runner. The parses are
// timed in the CPU time of the thread that runs them: wall-clock time is inflated unevenly by the test files running
// alongside, and the process's CPU time also counts the engine's background threads, which compile the Wasm build and
// collect garbage during the parses. 2,000 and 20,000 directives are measured after warm-up parses and in alternation,
// each keeping its fastest run; 18 leaves a margin over the expected ratio of 10 while failing for growth faster than
// about n^1.25.
test('parses a template that ends in an unclosed directive in linear time', { timeout: 60_000 }, () => {
  const small = `${'<p><%= a %></p>\n'.repeat(2000)}<% b`;
  const large = `${'<p><%= a %></p>\n'.repeat(20_000)}<% b`;
  parseCpuTime(large);
  parseCpuTime(large);
  let smallFastest = Infinity;
  let largeFastest = Infinity;
  for (let run = 0; run < 5; run++) {
    smallFastest = Math.min(smallFastest, parseCpuTime(small));
    largeFastest = Math.min(largeFastest, parseCpuTime(large));
  }
  expect(largeFastest / smallFastest).toBeLessThan(18);
});

function parseCpuTime(source: string): number {
  const start = process.threadCpuUsage();
  const tree = parser.parse(source);
  const { system, user } = process.threadCpuUsage(start);
  if (!tree) throw new Error('The parser returned no tree');
  const { hasError } = tree.rootNode;
  tree.delete();
  expect(hasError).toBe(true);
  return system + user;
}

import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

import { generationInputMtime } from '../helpers/generationInputs.js';

const Root = path.join(import.meta.dirname, '../..');
const WasmPath = path.join(Root, 'tree-sitter-embedded_template.wasm');
await Parser.init();
const parser = new Parser();
parser.setLanguage(await Language.load(WasmPath));

test('uses a Wasm build built from the current parser', () => {
  const sources = ['grammar.js', 'src/parser.c', 'src/tree_sitter/parser.h'].map(
    (name) => fs.statSync(path.join(Root, name)).mtimeMs
  );
  expect(
    Math.max(generationInputMtime(Root), ...sources) > fs.statSync(WasmPath).mtimeMs,
    'generation inputs or src/ changed after the Wasm build was built; run `bun run build/ci`'
  ).toBe(false);
});

test('parses a template that ends in an unclosed directive in linear time', { timeout: 60_000 }, () => {
  expectLinearTime((count) => `${'<p><%= a %></p>\n'.repeat(count)}<% b`, true);
});

test('parses runs of delimiter prefix characters in linear time', { timeout: 60_000 }, () => {
  expectLinearTime((count) => `${'<'.repeat(count)}%${'='.repeat(count)}%>`, false);
});

test('hoists token marking outside character-scanning loops in src/parser.c', () => {
  const parserSource = fs.readFileSync(path.join(Root, 'src/parser.c'), 'utf8');
  const repeatBlocks = [...parserSource.matchAll(/ts_lex_state_\d+:[\s\S]*?END_STATE\(\);/g)].map((match) => match[0]);
  expect(repeatBlocks.length).toBeGreaterThanOrEqual(2);
  for (const block of repeatBlocks) {
    const repeatIndex = block.indexOf('TS_LEX_REPEAT(');
    const acceptIndex = block.indexOf('ACCEPT_TOKEN(');
    expect(repeatIndex).toBeGreaterThanOrEqual(0);
    expect(acceptIndex).toBeGreaterThan(repeatIndex);
  }
});

// Thread CPU time avoids wall-clock noise from sibling test files and process-wide CPU time from background Wasm
// compilation and GC threads; 18 leaves headroom above the linear 10x ratio while rejecting ~n^1.25+ superlinear growth.
function expectLinearTime(buildSource: (count: number) => string, expectedError: boolean): void {
  const small = buildSource(2000);
  const large = buildSource(20_000);
  parseCpuTime(large, expectedError);
  parseCpuTime(large, expectedError);
  let smallFastest = Infinity;
  let largeFastest = Infinity;
  for (let run = 0; run < 5; run++) {
    smallFastest = Math.min(smallFastest, parseCpuTime(small, expectedError));
    largeFastest = Math.min(largeFastest, parseCpuTime(large, expectedError));
  }
  expect(largeFastest / smallFastest).toBeLessThan(18);
}

function parseCpuTime(source: string, expectedError: boolean): number {
  const start = process.threadCpuUsage();
  const tree = parser.parse(source);
  const { system, user } = process.threadCpuUsage(start);
  if (!tree) throw new Error('The parser returned no tree');
  const { hasError } = tree.rootNode;
  tree.delete();
  expect(hasError).toBe(expectedError);
  return system + user;
}

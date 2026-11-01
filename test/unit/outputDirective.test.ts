import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

test('keeps whitespace-slurping delimiters out of embedded code', async () => {
  await Parser.init();
  const parser = new Parser();
  parser.setLanguage(
    await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-embedded_template.wasm'))
  );
  const tree = parser.parse('<%= user_name _%><%- html _%><%= user_name %>');
  try {
    expect(tree?.rootNode.hasError).toBe(false);
    expect(tree?.rootNode.namedChildren.map((node) => node.namedChildren.map((child) => child.text))).toEqual([
      [' user_name '],
      [' html '],
      [' user_name '],
    ]);
  } finally {
    tree?.delete();
    parser.delete();
  }
});

test('keeps trimming markers outside comment and statement bodies', async () => {
  await Parser.init();
  const parser = new Parser();
  parser.setLanguage(
    await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-embedded_template.wasm'))
  );
  const tree = parser.parse('<%# first -%>text<%# second _%><%# third =%><% value = 7 =%><%= value %>');
  try {
    expect(tree?.rootNode.hasError).toBe(false);
    expect(
      tree?.rootNode.namedChildren.map((node) => [
        node.type,
        node.namedChildren.map((child) => child.text),
        node.lastChild?.text,
      ])
    ).toEqual([
      ['comment_directive', [' first '], '-%>'],
      ['content', [], undefined],
      ['comment_directive', [' second '], '_%>'],
      ['comment_directive', [' third '], '=%>'],
      ['directive', [' value = 7 '], '=%>'],
      ['output_directive', [' value '], '%>'],
    ]);
  } finally {
    tree?.delete();
    parser.delete();
  }
});

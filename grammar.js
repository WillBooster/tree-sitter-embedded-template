/**
 * @file Embedded Template grammar for tree-sitter
 * @author Max Brunsfeld <maxbrunsfeld@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'embedded_template',

  extras: _ => [],

  rules: {
    template: $ => repeat(choice(
      $.directive,
      $.output_directive,
      $.comment_directive,
      $.graphql_directive,
      $.content,
    )),

    // Keep pure `[^%=_-]+` and `[^<]*` tails outside any outer `(...)+` so their DFA states stay self-loops in
    // `ts_lex_table` (allowing the runtime lexer to scan runs before recording acceptance), and bound delimiter
    // prefixes (`[=_-]{1,3}` and `<`) so fallback before `%>`, `<%`, or EOF stays linear.
    code: _ => repeat1(choice(/[^%=_-]+|[=_-]{1,3}[^%=_-]+|%[^>%=_-][^%=_-]*|[%=_-]/, '%%>')),

    content: _ => prec.right(repeat1(choice(/[^<]+|<([^<%][^<]*)?/, '<%%'))),

    directive: $ => seq(
      choice('<%', '<%_', '<%|', '<%~'),
      optional($.code),
      choice('%>', '-%>', '=%>', '_%>'),
    ),

    output_directive: $ => seq(
      choice('<%=', '<%==', '<%|=', '<%|==', '<%-'),
      optional($.code),
      choice('%>', '-%>', '=%>', '_%>'),
    ),

    comment_directive: $ => seq(
      '<%#',
      optional(alias($.code, $.comment)),
      choice('%>', '-%>', '=%>', '_%>'),
    ),

    graphql_directive: $ => seq(
      '<%graphql',
      optional($.code),
      '%>',
    ),
  },
});

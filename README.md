# @willbooster/tree-sitter-embedded-template

[![npm version](https://img.shields.io/npm/v/@willbooster/tree-sitter-embedded-template.svg)](https://www.npmjs.com/package/@willbooster/tree-sitter-embedded-template)
[![license](https://img.shields.io/npm/l/@willbooster/tree-sitter-embedded-template.svg)](https://www.npmjs.com/package/@willbooster/tree-sitter-embedded-template)
[![Test](https://github.com/WillBooster/tree-sitter-embedded-template/actions/workflows/test.yml/badge.svg)](https://github.com/WillBooster/tree-sitter-embedded-template/actions/workflows/test.yml)
[![Test rust](https://github.com/WillBooster/tree-sitter-embedded-template/actions/workflows/test-rust.yml/badge.svg)](https://github.com/WillBooster/tree-sitter-embedded-template/actions/workflows/test-rust.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![wbfy](https://img.shields.io/badge/wbfy-20.46.1-1e90ff.svg)](https://github.com/WillBooster/shared/tree/main/packages/wbfy)
[![crates.io](https://img.shields.io/crates/v/willbooster-tree-sitter-embedded-template.svg)](https://crates.io/crates/willbooster-tree-sitter-embedded-template)

Embedded template grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter), forked from
[tree-sitter/tree-sitter-embedded-template](https://github.com/tree-sitter/tree-sitter-embedded-template). We are grateful
to its authors and contributors. This is not an official release of that project.

It parses templating languages such as ERB and EJS, in which scripting code is embedded in text with the delimiters
`<%` and `%>`. This fork extends upstream's version 0.25.0 grammar with EJS output-tag whitespace slurping
and HTML/Perl injections for angle-delimited Embedded Perl tags.
It generates the parser with the
[WillBooster/tree-sitter](https://github.com/WillBooster/tree-sitter) generator. The parser loads only with that
fork's runtime, version 10.0.2 or later in the 10.x series
([willbooster-tree-sitter](https://crates.io/crates/willbooster-tree-sitter),
[@willbooster/web-tree-sitter](https://www.npmjs.com/package/@willbooster/web-tree-sitter)); upstream's runtime rejects it.

## Usage

The npm package ships `tree-sitter-embedded_template.wasm` for
[@willbooster/web-tree-sitter](https://www.npmjs.com/package/@willbooster/web-tree-sitter) version 10.0.2 or later in the 10.x series, which runs in Node.js, Bun, browsers, and Cloudflare Workers.
In Node.js and Bun, load the grammar from its path:

```js
import { fileURLToPath } from 'node:url';
import { Language, Parser } from '@willbooster/web-tree-sitter';

await Parser.init();
const parser = new Parser();
const wasmPath = fileURLToPath(
  import.meta.resolve('@willbooster/tree-sitter-embedded-template/tree-sitter-embedded_template.wasm')
);
parser.setLanguage(await Language.load(wasmPath));
const tree = parser.parse('<ul><% items.each do |item| %><li><%= item %></li><% end %></ul>\n');
```

In browsers, serve both `.wasm` files and load them by URL (the example uses Vite's `?url` imports):

```js
import { Language, Parser } from '@willbooster/web-tree-sitter';
import runtimeUrl from '@willbooster/web-tree-sitter/web-tree-sitter.wasm?url';
import grammarUrl from '@willbooster/tree-sitter-embedded-template/tree-sitter-embedded_template.wasm?url';

await Parser.init({ locateFile: () => runtimeUrl });
const parser = new Parser();
parser.setLanguage(await Language.load(grammarUrl));
```

Cloudflare Workers do not allow compiling Wasm at run time, so import both `.wasm` files as modules, with or without
Node.js compatibility:

```js
import { Language, Parser } from '@willbooster/web-tree-sitter';
import runtime from '@willbooster/web-tree-sitter/web-tree-sitter.wasm';
import grammar from '@willbooster/tree-sitter-embedded-template/tree-sitter-embedded_template.wasm';

await Parser.init({ wasmModule: runtime });
const parser = new Parser();
parser.setLanguage(await Language.load(grammar));
```

The package also ships `grammar.js`, the queries in `queries/`, and the node types in `src/node-types.json`.

For HTML Embedded Perl templates, select `queries/injections-ep.scm` (or `INJECTIONS_EP_QUERY` in Rust).
CLI language discovery associates every `.ep` file with the `text.html.ep` scope, including non-HTML templates
such as `mail.txt.ep`. The query always treats template content as HTML; configure a different content injection
for non-HTML formats. The host must process combined injections and provide HTML and Perl parsers generated
with WillBooster/tree-sitter, matching this runtime's ABI. Use `@willbooster/tree-sitter-html` or
`willbooster-tree-sitter-html` for HTML. For Perl, check out this repository
and [tree-sitter-perl/tree-sitter-perl](https://github.com/tree-sitter-perl/tree-sitter-perl). From the Perl checkout
as the working directory, run `<embedded-template-checkout>/script/tree-sitter generate grammar.js`, replacing
`<embedded-template-checkout>` with this repository's absolute checkout path. Then build the generated parser for
your host and register it as `perl`. The npm package and Rust crate include neither this script nor a Perl parser.
Upstream-generated parsers cannot load in this runtime.
With these parsers configured, the query supports the existing angle-delimited tags, such as
`<% my $name = "World"; %><p><%= $name %></p>`; it is not a full Mojo::Template parser.
Perl lines beginning with `%`, template capture markers (`begin`/`end`), custom delimiters, and whitespace-trimming
`=%>` on non-output directives are not supported.

In Rust, depend on the [crate](https://crates.io/crates/willbooster-tree-sitter-embedded-template) and on
[willbooster-tree-sitter](https://crates.io/crates/willbooster-tree-sitter), the runtime this package is tested and
fuzzed with:

```toml
[dependencies]
tree-sitter = { package = "willbooster-tree-sitter", version = "10.0.2" }
tree-sitter-embedded-template = { package = "willbooster-tree-sitter-embedded-template", version = "3" }
```

```rust
let mut parser = tree_sitter::Parser::new();
parser.set_language(&tree_sitter_embedded_template::LANGUAGE.into())?;
```

## Development

```sh
mise install
bun install --frozen-lockfile
bun run test/ci-setup # installs Chromium for the browser test
bun run build/ci
bun run test
script/parse-examples
cargo test
```

The scripts and tests generate, build, test, and parse with `script/tree-sitter`, the tree-sitter CLI of the
WillBooster/tree-sitter runtime version locked in `Cargo.lock`, since the generator and the runtime of upstream's CLI are
not the ones this package ships with. Its first run downloads that CLI from the runtime's GitHub Release, or builds it
with `cargo` (whose build runs the CMake that `mise.toml` pins) when the download fails or the release has no binary that runs here. Run other CLI commands through it as
well (e.g. `script/tree-sitter parse --grammar-path . file.erb`).

`bun run generate` records a fresh generation profile from the applicable `test/corpus` cases, then generates
compact parser tables. It would also profile files tracked in `examples/`, but this repository tracks none: the
directory holds only the clones `script/parse-examples` makes. The parser also embeds metadata from `tree-sitter.json`.
After changing a grammar, `tree-sitter.json`, or a corpus case, regenerate and commit `src/`.
Profiles in `.tmp/generation-profiles/` are temporary and must not be committed. `bun run build-wasm`, `bun run build/ci`,
and the release build regenerate the parsers before compiling them.

`bun run test` runs:

- the corpus in `test/corpus`, with the native build and with the Wasm build (the first run downloads the WASI SDK);
- an incremental-parsing check (`test/unit/incremental.test.ts`): `script/fuzz-corpus` runs `tree-sitter fuzz`, which
  edits each corpus case at random, reparses it, undoes the edits, and reparses again. `TREE_SITTER_SEED`,
  `TREE_SITTER_ITERATIONS`, and `TREE_SITTER_EDITS` run other or more edits;
- a check that the real-world ERB and EJS templates in `examples/` fail to parse exactly as listed in
  `script/known-failures.txt`, which is empty now. The first run clones the repositories. The example repositories are pinned to commits in
  `script/parse-examples`. After a grammar change or a moved pin alters that list, `script/parse-examples` rewrites it;
  review its diff before committing;
- a performance check (`test/unit/performance.test.ts`) that parsing a template whose last directive is still open
  takes linear time, since consumers parse files while they are being edited. It loads the Wasm build through
  @willbooster/web-tree-sitter, which `bun run build/ci` rebuilds after regenerating the parser;
- a check (`test/unit/runtimeVersion.test.ts`) that `@willbooster/web-tree-sitter` in `package.json` and
  `willbooster-tree-sitter` in `Cargo.lock` are the same version, since the Wasm tests run on the former and the Rust
  tests, the fuzzer, and the CLI on the latter;
- tests that load the Wasm build with @willbooster/web-tree-sitter in Chromium (`test/e2e/browser.test.ts`) and in
  Cloudflare Workers with and without Node.js compatibility (`test/e2e/workers.test.ts`).

The tests and `script/parse-examples` compile the parser into `.tmp/tree-sitter-lib` rather than the CLI's cache shared
by every checkout; `script/fuzz-corpus` builds a parser of its own in `.tmp/fuzz` for each run and deletes it
afterwards.

CI also runs these tests on Linux arm64 and macOS, where the CLI compiles the parser natively, and fuzzes the parser
with libFuzzer and sanitizers (`.github/workflows/robustness.yml`).

### References

- [ERB Documentation](https://docs.ruby-lang.org/en/master/ERB.html)
- [EJS Documentation](https://ejs.co/#docs)
- [etlua Documentation](https://github.com/leafo/etlua)
- [Eta Documentation](https://eta.js.org/docs)
- [EP Documentation](https://docs.mojolicious.org/Mojo/Template)

import { testCommand } from './run.js';

// Clones real-world ERB and EJS templates into examples/ on the first run, which takes a few minutes.
testCommand(
  'fails to parse exactly the real-world ERB and EJS templates in script/known-failures.txt',
  ['script/parse-examples', '--check'],
  1_800_000
);

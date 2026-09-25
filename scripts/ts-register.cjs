/* eslint-disable @typescript-eslint/no-require-imports */
// Lets `node --test` load the .ts tests (npm test). Type-checking is left to `tsc --noEmit`.
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "commonjs", moduleResolution: "node" } });

/* eslint-disable @typescript-eslint/no-require-imports */
// Lets `node --test` load the .ts tests (npm test). Type-checking is left to `tsc --noEmit`.
const Module = require("module");
const path = require("path");

// Resolve the "@/..." alias from tsconfig so tests can load route files that use it.
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) request = path.join(__dirname, "..", "src", request.slice(2));
  return resolveFilename.call(this, request, ...rest);
};

require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "commonjs", moduleResolution: "node" } });

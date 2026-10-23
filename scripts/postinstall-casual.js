#!/usr/bin/env node
/**
 * Runs from package.json "postinstall", after patch-package.
 *
 * @casualoffice/docs renders through @schnsrw/core, whose dist chunk loads its
 * layout engine with `new URL("s1engine_wasm_bg.wasm", import.meta.url)` — a
 * path relative to dist/ — while the package ships the file in wasm/. Webpack
 * resolves that URL at build time relative to dist/, finds nothing, and the
 * editor renders a blank page at runtime (the engine cannot measure text
 * without its WASM). Copying the file next to the chunk lets the existing
 * `.wasm` asset rule emit it and rewrite the URL.
 *
 * Idempotent: copies only when the target is missing or differs in size.
 * Silent no-op when @schnsrw/core is not installed.
 */
const fs = require("fs");
const path = require("path");

const core = path.join(__dirname, "..", "node_modules", "@schnsrw", "core");
const src = path.join(core, "wasm", "s1engine_wasm_bg.wasm");
const dst = path.join(core, "dist", "s1engine_wasm_bg.wasm");

if (!fs.existsSync(src)) {
  console.log("[postinstall-casual] @schnsrw/core wasm not found, nothing to do");
  process.exit(0);
}
if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) {
  fs.copyFileSync(src, dst);
  console.log("[postinstall-casual] copied s1engine_wasm_bg.wasm into @schnsrw/core/dist");
}

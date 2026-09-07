// Load an `export`-flavoured source file under plain node `require`.
//
// Most skeletons in this app are CommonJS and load as-is, which is why
// render-skeleton's renderModule can simply require them. A handful — the
// window toolkit and the button factory it leans on — are written with
// `export function`, and webpack is the only thing that has ever read them.
// Without this they cannot be tested at all, so the markup that carries the
// workspace toolbar (search, + New, the view toggle, the file-type filter bar)
// was the one part of the window with no test able to reach it.
//
// The transform is deliberately the smallest one that works: strip the `export`
// keyword off top-level declarations and re-export those names at the end. It
// is installed as a `.js` handler for the length of one call and restored
// after, and it only rewrites files that actually carry a top-level `export` —
// every CommonJS module in the tree still compiles verbatim.
const Module = require("node:module");
const { readFileSync } = require("node:fs");

const HAS_EXPORT = /^export\s+(function|const|let|var|class)\s/m;

// `export function foo` / `export const foo` — the only two shapes in the
// files this reaches. A default export would need different handling; there is
// none here, and an unnoticed one shows up as a missing name at require time
// rather than as a silently wrong tree.
const DECL = /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;

function transform(src) {
  const names = [...src.matchAll(DECL)].map((m) => m[1]);
  const body = src.replace(/^export\s+/gm, "");
  const tail = names.map((n) => `  ${n},`).join("\n");
  return `${body}\nmodule.exports = {\n${tail}\n};\n`;
}

// Require `relPath` (from the repo root) with the transform active for it and
// for everything it pulls in. Modules loaded through here are dropped from the
// cache on the way in AND on the way out, so a later plain require of the same
// file is unaffected by the rewrite.
function requireEsmish(relPath) {
  const { join } = require("node:path");
  const abs = require.resolve(join(__dirname, "..", "..", relPath));
  const js = Module._extensions[".js"];
  const touched = new Set();
  Module._extensions[".js"] = function (mod, filename) {
    const src = readFileSync(filename, "utf8");
    if (!HAS_EXPORT.test(src)) return js(mod, filename);
    touched.add(filename);
    mod._compile(transform(src), filename);
  };
  const drop = (f) => delete require.cache[f];
  drop(abs);
  try {
    return require(abs);
  } finally {
    Module._extensions[".js"] = js;
    drop(abs);
    touched.forEach(drop);
  }
}

module.exports = { requireEsmish, transform };

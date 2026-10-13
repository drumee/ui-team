// connect-float-avatar-skin.test.js — the docked self-view avatar must be sized
// against the float tile itself, not the viewport.
//
//   node --test tests/connect-float-avatar-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const compile = (f) =>
  sass
    .compile(path.join(SRC, f), {
      loadPaths: [SRC, path.join(SRC, "skin")],
      silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
      logger: sass.Logger.silent,
    })
    .css.replace(/\s+/g, " ");
const css = compile("builtins/window/connect/skin/index.scss");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rule = (sel) => {
  const m = css.match(new RegExp("(?:^|[}\\s])" + esc(sel) + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};

test("the float tile is a size container, so cq units measure the tile", () => {
  // The bare selector compiles to several rules (base + responsive variants);
  // the shell's base rule is the one that must carry it.
  const bodies = [...css.matchAll(/(?:^|[}\s])\.window-connect__float-tiles \{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(bodies.some((b) => /container-type: size/.test(b)), "no container-type on the float tile");
});

test("connect's 99px tile caps the avatar so it clears the name pill", () => {
  const sel =
    ".window-connect__main--call .window-connect__float-tiles .participants-manager__ui .user-profile__ui";
  const r = rule(sel);
  assert.match(r, /width: min\(44cqh, 44px\) !important/);
  assert.match(r, /height: min\(44cqh, 44px\) !important/);
  assert.match(r, /margin-bottom: 28px !important/);
});

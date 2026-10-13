// connect-precall-layout-skin.test.js — the 1:1 call's pre-call screen
// centres identity + status + actions as ONE vertical group, and the live
// participant tiles carry no connect-specific corner radius.
//
//   node --test tests/connect-precall-layout-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/connect/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bodies = (sel) =>
  [...css.matchAll(new RegExp("(?:^|[}\\s,])" + esc(sel) + "(?:,[^{]*)? \\{([^}]*)\\}", "g"))].map((m) => m[1]);

// The shared meeting shell keeps its own 8px tile radius; only the connect
// override (var(--corner-radius-5)) is gone.
test("no connect-specific corner radius on the live tiles", () => {
  assert.doesNotMatch(
    css,
    /\.participants-manager__ui \.remote-user \{ border-radius: var\(--corner-radius-5\)/
  );
});

test("pre-call body centres its content vertically", () => {
  const b = bodies(".window-connect__body[data-phase=precall]").join(" ");
  assert.match(b, /justify-content: center/);
});

test("the identity stage no longer grows to push the footer to the bottom", () => {
  const b = bodies(".window-connect__precall-stage").join(" ");
  assert.match(b, /flex: 0 1 auto/);
  assert.doesNotMatch(b, /flex: 1;/);
});

test("the footer stacks from its top, right under the identity", () => {
  const b = bodies(".window-connect__precall-footer").join(" ");
  assert.match(b, /justify-content: flex-start/);
  assert.doesNotMatch(b, /justify-content: flex-end/);
});

// Any bottom padding on the footer (mobile / short variants included) would
// shift the centred group upward.
test("no footer variant pads its bottom", () => {
  const rules = [...css.matchAll(/__precall-footer \{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(rules.length >= 3, "expected base + mobile + short footer rules");
  for (const r of rules) {
    const pad = r.match(/padding: ([^;]+);/);
    if (!pad) continue;
    const parts = pad[1].trim().split(/\s+/);
    assert.equal(parts.length === 3 ? parts[2] : parts.length === 4 ? parts[2] : "0", "0", `footer padding ${pad[1]}`);
  }
});

// Short windows (data-short) shrink the avatar circle to 88px. The ROOT must
// shrink with it: shrinking only the children left an 88px circle in the
// top-left corner of a 120px box — 16px left of the name, with a gap below.
test("short window: the avatar root shrinks with its circle", () => {
  const m = css.match(/\.window-connect__ui\[data-short="?1"?\] \.window-connect__avatar\.user-profile \{([^}]*)\}/);
  assert.ok(m, "missing short-window avatar root rule");
  assert.match(m[1], /width: 88px/);
  assert.match(m[1], /height: 88px/);
});

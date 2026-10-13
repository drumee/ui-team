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

// The stage pads 16px above the avatar for the pulse ring; the footer pads
// the same 16px below the buttons, so the centred group stays balanced.
test("every footer variant pads its bottom like the stage pads its top", () => {
  const rules = [...css.matchAll(/__precall-footer \{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(rules.length >= 3, "expected base + mobile + short footer rules");
  for (const r of rules) {
    const pad = r.match(/padding: ([^;]+);/);
    if (!pad) continue;
    const parts = pad[1].trim().split(/\s+/);
    assert.equal(parts[2], "var(--spacer-5)", `footer padding ${pad[1]}`);
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

// The ringing pulse spreads a 16px box-shadow ring around the avatar, and
// __precall-stage clips (overflow: hidden). The stage must keep >= 16px
// above and below the avatar, or the ring is cut flat at the top and runs
// into the name below.
test("the stage leaves room for the 16px pulse ring, in every size", () => {
  const ring = css.match(/50% \{ box-shadow: 0 0 0 (\d+)px/);
  assert.ok(ring, "pulse keyframe not found");
  const spread = Number(ring[1]);
  // The parked 300x180 dock tile deliberately has no room for it.
  const pads = [...css.matchAll(/([^{}]*)__precall-stage \{([^}]*)\}/g)]
    .filter((m) => !/data-call-tile/.test(m[1]))
    .map((m) => (m[2].match(/padding: ([^;]+);/) || [])[1])
    .filter(Boolean);
  assert.ok(pads.length > 0, "no stage padding rule");
  for (const p of pads) {
    const v = p.trim().split(/\s+/)[0];
    const px = /^var\(--spacer-(\d)\)$/.test(v)
      ? { 4: 12, 5: 16, 6: 24, 7: 32, 8: 40 }[RegExp.$1]
      : parseFloat(v);
    assert.ok(px >= spread, `stage padding ${p} is under the ${spread}px ring`);
  }
});

test("short window: avatar-to-name gap clears the ring", () => {
  const m = css.match(/\.window-connect__ui\[data-short="?1"?\] \.window-connect__identity \{([^}]*)\}/);
  assert.ok(m, "missing short identity rule");
  assert.match(m[1], /gap: var\(--spacer-6\)/);
});

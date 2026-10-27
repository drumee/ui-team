// tests/tasks-activity-thread-skin.test.js — a comment thread is ONE card with
// its replies nested inside it and joined by a purple curved connector (Figma
// 944:107305, "Activity detail" 2037-14883).
//
//   node --test tests/tasks-activity-thread-skin.test.js
//
// Compiles the REAL tasks skin and reads the rules; headless Chromium on a
// fixture is the visual check (see the plan, Task 4).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const ROOT = path.join(__dirname, "..");
const css = sass.compile(path.join(ROOT, "src/drumee/builtins/window/tasks/skin/index.scss"), {
  loadPaths: [path.join(ROOT, "src/drumee"), path.join(ROOT, "src/drumee/skin"), path.join(ROOT, "skin")],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

// Declarations of every compressed rule whose selector list holds `sel`.
// Compressed output unquotes identifier attribute values but keeps numeric
// ones quoted, so compare unquoted.
const unq = (x) => x.replace(/="([A-Za-z_][\w-]*)"\]/g, "=$1]");
function declsFor(sel) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].split(",").map((x) => unq(x.trim())).includes(unq(sel))) out.push(m[2]);
  }
  return out.join(";");
}

const P = ".tasks-panel";
const REPLIES = `${P}__comment-thread-replies`;
const REPLY_ROW = `${REPLIES} ${P}__comment-row[data-reply="1"]`;
const REPLYBOX = `${REPLIES} ${P}__comment-replybox`;

test("the thread is the card", () => {
  const d = declsFor(`${P}__comment-thread`);
  assert.match(d, /border:1px solid var\(--border-default/);
  assert.match(d, /border-radius:12px/);
  assert.match(d, /padding:16px/);
  assert.match(d, /position:relative/);
});

test("rows inside the card have no frame of their own but still anchor overlays", () => {
  const d = declsFor(`${P}__comment-row`);
  assert.doesNotMatch(d, /border:/);
  assert.doesNotMatch(d, /padding:16px/);
  assert.match(d, /position:relative/);
});

test("replies sit under the root's text column, without the old left-border spine", () => {
  const d = declsFor(REPLIES);
  assert.match(d, /margin-left:44px/);
  assert.doesNotMatch(d, /border-left/);
  assert.match(declsFor(REPLY_ROW), /padding:16px 0/);
});

test("connector: black trunk from under the root avatar, curved elbow into each reply", () => {
  const trunk = declsFor(`${P}__comment-thread[data-has-replies="1"]::before`);
  assert.match(trunk, /left:32px/);
  assert.match(trunk, /top:52px/);
  assert.match(trunk, /var\(--normal-fg-10, ?#0b0a21\)/);
  // The elbow is the ::after so it paints OVER the last item's ::before mask
  // (QA 2026-10-27: with the mask on top, the start of the curve was erased).
  for (const sel of [`${REPLY_ROW}::after`, `${REPLYBOX}::after`]) {
    const d = declsFor(sel);
    assert.match(d, /var\(--normal-fg-10, ?#0b0a21\)/, sel);
    assert.match(d, /border-bottom-left-radius:12px/, sel);
  }
});

test("the last reply OR an open composer ends the trunk, masked in the card's own colour", () => {
  // The mask starts where the curve leaves the trunk (elbow height - 12px
  // radius): row 32 → 20, pill 22 → 10.
  for (const [sel, top] of [
    [`${REPLIES}>${P}__comment-row[data-reply="1"]:last-child::before`, 20],
    [`${REPLIES}>${P}__comment-replybox:last-child::before`, 10],
  ]) {
    assert.match(declsFor(sel), new RegExp(`top:${top}px`), sel);
    const d = declsFor(sel);
    assert.match(d, /background:var\(--normal-bg-elevated/, sel);
    assert.doesNotMatch(d, /background:#fff/, sel);
    // The trunk stops at the last row's bottom edge (card padding), so the
    // mask must too: reaching further paints over the card's bottom border.
    assert.match(d, /bottom:0/, sel);
  }
});

test("type: 14px author, a smaller and lighter body, long strings still wrap", () => {
  const body = declsFor(`${P}__comment-body`);
  // QA 2026-10-27: down from Figma's 16px / 400. The typo mixin never emits
  // font-weight, so the weight has to be its own declaration.
  assert.match(body, /font-size:14px/);
  assert.match(body, /font-weight:300/);
  assert.match(body, /line-height:1\.4/);
  assert.match(body, /overflow-wrap:anywhere/);
  const author = declsFor(`${P}__comment-author`);
  assert.match(author, /font-size:14px/);
  assert.match(author, /line-height:1\.2/);
  assert.match(declsFor(`${P}__comment-time`), /line-height:1\.4/);
});

test("a mention in a posted comment is plain brand-purple text", () => {
  const d = declsFor(`${P}__comment-body ${P}__mention-chip`);
  assert.match(d, /color:var\(--col-primary-40, ?#5950ff\)/);
  assert.match(d, /background:(none|transparent)/);
  assert.match(d, /font-weight:inherit/);
});

test("16px action icons, composer and reply pill spacing", () => {
  assert.match(declsFor(`${P}__comment-action-ico`), /width:16px;height:16px/);
  assert.match(declsFor(`${P}__comment-composer`), /padding:12px 0/);
  assert.match(declsFor(`${P}__composer-actions`), /gap:8px/);
  const pill = declsFor(`${P}__comment-reply-pill`);
  assert.match(pill, /padding:12px 16px/);
  // Figma Grey/20 (#f2f2f7); --col-grey-20 is defined in no theme, so the
  // theme-aware overlay (rgba(0,0,0,.05) on white) stands in for it.
  assert.match(pill, /background:var\(--overlay-bg-05/);
});

test("with a 'Replying to' hint above the pill, the elbow and mask follow the pill down", () => {
  const box = `${REPLYBOX}:has(>${P}__comment-replying-to)`;
  assert.match(declsFor(`${box}::after`), /height:44px/);
  assert.match(
    declsFor(`${REPLIES}>${P}__comment-replybox:last-child:has(>${P}__comment-replying-to)::before`),
    /top:32px/,
  );
});

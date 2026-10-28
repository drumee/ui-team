// tests/button-busy.test.js — a modal footer's action button shows a loading
// state while its write is in flight (calendar-main__modal-foot,
// window-folder__meeting-modal-footer): the button wears data-loading, the
// footer data-busy so its sibling actions stand down, and a second press on a
// busy button is dropped. Cancel never goes through this.
//
//   node --test tests/button-busy.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { withButtonBusy } = require(path.join(__dirname, "../src/drumee/libs/button-busy.js"));

function fakeEl(parent = null) {
  const attrs = {};
  return {
    parentElement: parent,
    dataset: {},
    setAttribute: (k, v) => (attrs[k] = String(v)),
    removeAttribute: (k) => delete attrs[k],
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    attrs,
  };
}

test("the button and its footer are busy while the write runs", async () => {
  const foot = fakeEl();
  const btn = fakeEl(foot);
  let release;
  const run = withButtonBusy(btn, () => new Promise((r) => (release = r)));
  assert.equal(btn.dataset.loading, "1");
  assert.equal(btn.attrs["aria-busy"], "true");
  assert.equal(foot.dataset.busy, "1");
  release("ok");
  assert.equal(await run, "ok");
  assert.equal(btn.dataset.loading, undefined);
  assert.equal(btn.attrs["aria-busy"], undefined);
  assert.equal(foot.dataset.busy, undefined);
});

test("a second press on a busy button is dropped", async () => {
  const btn = fakeEl(fakeEl());
  let calls = 0;
  let release;
  const first = withButtonBusy(btn, () => {
    calls++;
    return new Promise((r) => (release = r));
  });
  const second = await withButtonBusy(btn, () => calls++);
  assert.equal(second, undefined);
  assert.equal(calls, 1);
  release();
  await first;
});

test("a failing write still clears the state, and rethrows", async () => {
  const foot = fakeEl();
  const btn = fakeEl(foot);
  await assert.rejects(withButtonBusy(btn, () => Promise.reject(new Error("x"))), /x/);
  assert.equal(btn.dataset.loading, undefined);
  assert.equal(foot.dataset.busy, undefined);
});

test("a synchronous early return clears at once", async () => {
  const btn = fakeEl(fakeEl());
  assert.equal(await withButtonBusy(btn, () => undefined), undefined);
  assert.equal(btn.dataset.loading, undefined);
});

test("no element: the action just runs", async () => {
  assert.equal(await withButtonBusy(null, () => 7), 7);
});

// ── wiring: which presses go through it ─────────────────────────────────────
const fs = require("node:fs");
const SRC = path.join(__dirname, "../src/drumee/builtins");
const CAL = fs.readFileSync(path.join(SRC, "panel/calendar/index.js"), "utf8");
const FOLDER = fs.readFileSync(path.join(SRC, "window/folder/index.js"), "utf8");
const caseBody = (src, name) => {
  const at = src.indexOf(`case "${name}":`);
  assert.ok(at > 0, `${name} case not found`);
  return src.slice(at, src.indexOf("case ", at + 1));
};

test("calendar: Create/Update and Delete buttons load, Cancel does not", () => {
  for (const [svc, fn] of [
    ["cal-submit-task", "_submitTask"],
    ["cal-delete-task", "_deleteTask"],
    ["cal-submit-meeting", "_submitMeeting"],
    ["cal-delete-meeting", "_deleteMeeting"],
  ]) {
    assert.match(caseBody(CAL, svc), new RegExp(`withButtonBusy\\(cmd\\.el, \\(\\) => this\\.${fn}\\(\\)\\)`), svc);
  }
  assert.doesNotMatch(caseBody(CAL, "cal-close-form"), /withButtonBusy/);
});

test("folder meeting modal: Schedule/Update and Delete buttons load", () => {
  assert.match(caseBody(FOLDER, "meeting-modal-submit"), /withButtonBusy\(cmd\.el, \(\) => this\.submitMeetingModal\(\)\)/);
  assert.match(caseBody(FOLDER, "meeting-modal-delete"), /withButtonBusy\(cmd\.el, \(\) => this\.deleteMeetingModal\(\)\)/);
});

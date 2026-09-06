// `#/desk?window_tutorial=<id>` — the way all six tours are reachable in a
// folder window for review, when only `share` has a live trigger there.
//
// It mirrors the desk's `?tutorial=` contract: 1-based and clamped step/screen,
// and `preview: 1`, which is what exempts the run from the seen-set on the way
// IN and on the way OUT. Without that exemption one look at a tour would kill
// its real trigger for the account, permanently, because a tour records itself
// on mount.
const test = require("node:test");
const assert = require("node:assert/strict");
const { previewRequest } =
  require("../src/drumee/builtins/window/tutorial/preview.js");

test("no param, no request", () => {
  assert.equal(previewRequest({}), null);
  assert.equal(previewRequest(), null);
});

test("an unknown tour id is not a request", () => {
  assert.equal(previewRequest({ window_tutorial: "nope" }), null);
});

test("an inherited Object property name is not a tour", () => {
  // These names are reachable from the URL hash, so this defends against
  // a real attack surface. A bare TOURS[id] lookup is truthy for inherited
  // members like 'constructor', so we must check own properties only.
  for (const id of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    assert.equal(previewRequest({ window_tutorial: id }), null, `${id} must not be reachable`);
  }
});

test("a non-string id is not a request", () => {
  assert.equal(previewRequest({ window_tutorial: 1 }), null);
});

test("every registry tour is reachable", () => {
  for (const id of ["workspace", "chat", "folder_task", "share", "migrate", "meeting"]) {
    const r = previewRequest({ window_tutorial: id });
    assert.ok(r, `${id} is not reachable`);
    assert.equal(r.tour, id);
  }
});

test("a preview is always flagged as one", () => {
  assert.equal(previewRequest({ window_tutorial: "share" }).opt.preview, 1);
});

test("step, screen and subject ride along when given", () => {
  const r = previewRequest({
    window_tutorial: "share",
    step: "2",
    screen: "4",
    subject: "workspace",
  });
  assert.equal(r.opt.enter_at_step, "2");
  assert.equal(r.opt.enter_at_screen, "4");
  assert.equal(r.opt.subject, "workspace");
});

test("absent step and screen are absent, not undefined keys", () => {
  const { opt } = previewRequest({ window_tutorial: "share" });
  assert.equal("enter_at_step" in opt, false);
  assert.equal("enter_at_screen" in opt, false);
  assert.equal("subject" in opt, false);
});

test("the full tour is NOT reachable in a window", () => {
  // 23 screens of desk chrome do not belong in a folder window pane.
  assert.equal(previewRequest({ window_tutorial: "full" }), null);
});

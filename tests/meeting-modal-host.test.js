// tests/meeting-modal-host.test.js — meeting_modal_host: the folder's
// "Meeting information" modal outside the folder (the Personal Calendar mounts
// it for a meeting chip). It borrows the folder's own meeting methods, so
// every this.x() those methods reach must be borrowed too, or be the host's
// own, or ui-core's — otherwise a path (an upload, Join, a file chip) throws
// only when someone takes it.
//
//   node --test tests/meeting-modal-host.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/folder");
const HOST = fs.readFileSync(path.join(DIR, "meeting-modal-host.js"), "utf8");
const FOLDER =
  fs.readFileSync(path.join(DIR, "index.js"), "utf8") +
  fs.readFileSync(path.join(DIR, "meeting-desc-editor.js"), "utf8");

const listOf = (name) => {
  const at = HOST.indexOf(`const ${name} = [`);
  assert.ok(at >= 0, `${name} not found`);
  return eval(HOST.slice(HOST.indexOf("[", at), HOST.indexOf("];", at) + 1));
};
const BORROWED = listOf("BORROWED");
const HOST_OWN = listOf("HOST_OWN");
// ui-core / Backbone / Marionette, present on any LetcBox.
const BASE = [
  "mget", "mset", "fetchService", "postService", "ensurePart", "getPart",
  "triggerHandlers", "warn", "isDestroyed", "feed", "trigger", "debug",
  "declareHandlers", "listenTo", "listenToOnce", "stopListening", "uploadFile",
];

// Every method body in the folder (and its desc-editor mixin), by name.
const DEFS = {};
for (const m of FOLDER.matchAll(/^  (?:async )?([A-Za-z_$][\w$]*)\([^)]*\) \{$/gm)) {
  DEFS[m[1]] = FOLDER.slice(m.index, FOLDER.indexOf("\n  }\n", m.index));
}

test("every borrowed method exists on the folder", () => {
  for (const n of BORROWED) assert.ok(DEFS[n], n);
});

test("every this.x() a borrowed method calls is borrowed, the host's own, or ui-core's", () => {
  const known = new Set([...BORROWED, ...HOST_OWN, ...BASE]);
  const gaps = new Set();
  for (const n of BORROWED) {
    for (const c of DEFS[n].matchAll(/this\.([A-Za-z_$][\w$]*)\(/g)) {
      if (!known.has(c[1])) gaps.add(`${n} → ${c[1]}`);
    }
  }
  assert.deepEqual([...gaps], []);
});

// The modal's skeleton calls back into its host too (ui.meetingCreator…).
// A gap there threw inside the skeleton on stage — "ui.meetingCreator is not
// a function" — and left the calendar's backdrop with no card on it.
test("every ui.x() the modal skeleton calls is borrowed or the host's own", () => {
  const SKL = fs.readFileSync(path.join(DIR, "skeleton/meeting-modal.js"), "utf8");
  const known = new Set([...BORROWED, ...HOST_OWN, ...BASE]);
  const gaps = [...new Set([...SKL.matchAll(/\bui\.([A-Za-z_$][\w$]*)\(/g)].map((m) => m[1]))]
    .filter((n) => !known.has(n));
  assert.deepEqual(gaps, []);
});

test("the host keeps the folder's skin family", () => {
  assert.match(HOST, /prototype\.figName = "window_folder"/);
});

// ── opening ─────────────────────────────────────────────────────────────────
global.LOCALE = { MEETING_NOT_FOUND: "Meeting not found" };
const said = [];
global.Butler = { say: (m) => said.push(m) };
const openFromList = eval(`(${sliceFunction(HOST, "_openFromList(rows)")})`);
const reportClosed = eval(`(${sliceFunction(HOST, "_reportClosed()")})`);

function host(opts) {
  const self = {
    opened: [],
    sent: [],
    mget: (k) => opts[k],
    openMeetingModal(o) {
      this.opened.push(o);
    },
    triggerHandlers(o) {
      this.sent.push(o);
    },
    _reportClosed: reportClosed,
    _applyViewOnly() {},
  };
  return self;
}

test("opening finds the record by nid; an occurrence joins its own start", async () => {
  const rows = [{ id: "m2", metadata: "{}" }, { id: "m1", metadata: "{}" }];
  const h = host({ meeting_nid: "m1", occurrence: 1790874000 });
  await openFromList.call(h, rows);
  assert.deepEqual(h.opened, [{ meeting: rows[1], occurrence: 1790874000 }]);
});

test("a single row (collapsed to an object) is found too", async () => {
  const row = { id: "m1", metadata: "{}" };
  const h = host({ meeting_nid: "m1" });
  await openFromList.call(h, row);
  assert.deepEqual(h.opened, [{ meeting: row, occurrence: null }]);
});

test("a missing record says so and reports the modal closed, unwritten", () => {
  said.length = 0;
  const h = host({ meeting_nid: "gone" });
  openFromList.call(h, [{ id: "m1" }]);
  assert.deepEqual(h.opened, []);
  assert.deepEqual(said, ["Meeting not found"]);
  assert.deepEqual(h.sent, [{ service: "meeting-host-closed", wrote: false }]);
});

// ── closing ─────────────────────────────────────────────────────────────────
test("closing reports once, after the write that followed it", async () => {
  /* eslint-disable no-unused-vars */
  const WindowFolder = { prototype: { closeMeetingModal() {} } };
  /* eslint-enable no-unused-vars */
  const close = eval(`(${sliceFunction(HOST, "closeMeetingModal()")})`);
  const refresh = eval(`(${sliceFunction(HOST, "_refreshSchedule()")})`);
  const h = host({});
  h.isDestroyed = () => false;
  // The folder's save: closeMeetingModal() THEN _refreshSchedule().
  close.call(h);
  refresh.call(h);
  close.call(h);
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(h.sent, [{ service: "meeting-host-closed", wrote: true }]);
});

// Escape (or any calendar-side close) destroys the host without the folder's
// close: its timers (invitee blur) and uploads must still be torn down, and
// nothing reported back — the calendar is the one closing.
test("destroying the host runs the folder's teardown, silently", () => {
  let folderClosed = 0;
  /* eslint-disable no-unused-vars */
  const WindowFolder = { prototype: { closeMeetingModal() { folderClosed++; } } };
  /* eslint-enable no-unused-vars */
  const destroy = eval(`(${sliceFunction(HOST, "onBeforeDestroy()")})`);
  const h = host({});
  destroy.call(h);
  assert.equal(folderClosed, 1);
  assert.equal(h._hostClosed, true);
  assert.deepEqual(h.sent, []);
});

// The record is looked up across the whole hub, not by the chip's time: some
// stored meetings end before they start (an edit moved stime, not etime), and
// room_list_scheduled's overlap test drops those from a tight window — on
// stage that read as "That meeting no longer exists" for a live meeting.
//
// And the "whole hub" is asked for with EXPLICIT bounds. Omitting them does
// not mean "everything" on the server: its database layer turns a null into
// '' and the call fails — "Incorrect integer value: '' for column _stime",
// call room_list_scheduled('', '') — which room.list swallows into an empty
// list. That is what every chip got from a range-less request on stage.
test("the load asks room.list for all time, explicitly, uncached", () => {
  const load = sliceFunction(HOST, "async _load()");
  const call = load.slice(load.indexOf("this.fetchService({"), load.indexOf("});", load.indexOf("this.fetchService({")));
  assert.match(call, /stime: 0,/);
  assert.match(call, /etime: ALL_TIME_END,/);
  assert.match(call, /_ts: Date\.now\(\)/);
  assert.match(HOST, /const ALL_TIME_END = 2147483647;/);
});

// Whatever goes wrong opening the modal must not strand the calendar's
// backdrop with nothing on it (stage: a skeleton TypeError did exactly that).
test("a failure opening the modal reports it closed", async () => {
  const h = host({ meeting_nid: "m1" });
  h.warn = () => {};
  h.openMeetingModal = () => Promise.reject(new TypeError("boom"));
  await openFromList.call(h, [{ id: "m1" }]);
  assert.deepEqual(h.sent, [{ service: "meeting-host-closed", wrote: false }]);
});

// figName "window_folder" lends the modal its skin family, but ui-core's
// onRender also stamps the HOST's root with the fig classes — "window
// window-folder window__item window__ui window-folder__ui" — so the window
// skin drew an empty folder window behind the "Meeting information" modal on
// the Personal Calendar. The host takes those classes off its own root.
test("the host's root does not wear the folder window's classes", () => {
  const shed = eval(`(${sliceFunction(HOST, "_shedFolderClasses()")})`);
  const classes = new Set(["drumee-box", "window", "window-folder", "window__item", "window__ui", "window-folder__ui"]);
  const self = {
    el: {
      classList: {
        remove: (...c) => c.forEach((x) => classes.delete(x)),
        add: (...c) => c.forEach((x) => classes.add(x)),
      },
    },
  };
  shed.call(self);
  assert.deepEqual([...classes].sort(), ["drumee-box", "meeting-modal-host"]);
  // On every render, after ui-core's own onRender stamped them.
  const render = sliceFunction(HOST, "onRender()");
  assert.ok(render.indexOf("super.onRender") < render.indexOf("this._shedFolderClasses()"));
});

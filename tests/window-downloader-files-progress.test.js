// window-downloader-files-progress.test.js — "Multiple files" reports in the
// downloader, not in each row.
//
//   node --test tests/window-downloader-files-progress.test.js
//
// downloadFiles used to call each row's download(), which mounts a progress
// widget inside media-row__container. It now fetches through the row's
// fetchFile with the downloader's own progress, one file after the other.
// Runs the real window/downloader methods against stub rows.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(
    path.join(__dirname, "../src/drumee/builtins/window/downloader/index.js"),
    "utf8",
  )
  .replace(/\r\n/g, "\n");

if (!String.prototype.format) {
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] != null ? args[i] : m));
  };
}
const LOCALE = {
  DOWNLOADING: "Downloading",
  ERROR: "Error",
  PENDING: "Pending",
  DOWNLOADING_X_OF_Y: "Downloading {0} of {1}",
  DOWNLOAD_COMPLETE: "Download complete",
  DOWNLOAD_X_FAILED: "{0} file(s) couldn't be downloaded",
  CLOSE: "Close",
};
const _a = new Proxy({ none: "none" }, { get: (t, k) => (k in t ? t[k] : String(k)) });
const _e = { close: "close" };
const filesize = (n) => `${n}B`;

// The slices read `window` (matchMedia) — a stub the motion tests can flip.
globalThis.__win = { matchMedia: () => ({ matches: false }) };

const names = [
  "downloadFiles()",
  "_nextFile()",
  "_paintItem(i, status, bytes = 0)",
  "_paintFiles()",
  "_filesDone()",
  "abortFiles()",
  "_dock()",
  "toggleExpand()",
  "dismiss()",
  "_motionOk()",
  "_animateShow()",
  "_animateSwitch(before)",
];
const methods = {};
for (const sig of names) {
  methods[sig.replace(/\(.*\)/, "")] = new Function(
    "_", "_a", "_e", "LOCALE", "filesize", "require", "window",
    "DL_SHOW_MS", "DL_SWITCH_MS", "DL_CLOSE_MS",
    `return ${sliceFunction(SRC, sig)}`,
  )(_, _a, _e, LOCALE, filesize, () => () => ({}), globalThis.__win, 200, 320, 180);
}

// A row: fetchFile streams `chunks` into the progress it is given.
function row(name, size, { chunks = [size], fail = false, type = "document" } = {}) {
  const r = {
    name,
    attrs: { filename: name, ext: "txt", filesize: size, filetype: type },
    calls: [],
    mget(k) { return this.attrs[k]; },
    actualNode: () => ({ url: `/file/${name}` }),
    download() { this.calls.push("download"); },
    async fetchFile(o) {
      this.calls.push(["fetchFile", o.url, o.download]);
      if (fail) return { error: 500 };
      let loaded = 0;
      for (const c of chunks) {
        loaded += c;
        o.progress.update({ loaded, total: size });
        await null;
      }
      return undefined;
    },
    unselect() {},
  };
  return r;
}

function win(nodes) {
  const els = {};
  const node = () => ({ textContent: "", style: {}, dataset: {} });
  // One stub per list row, each with its own parts (skeleton/files.js).
  const rows = nodes.map(() => {
    const parts = {};
    return {
      ...node(),
      parts,
      querySelector(sel) {
        const k = sel.replace(".window-downloader__item-", "");
        return (parts[k] = parts[k] || node());
      },
    };
  });
  const el = {
    style: {},
    dataset: {},
    animations: [],
    // Centred before docking, bottom-right after (the skin's placement).
    getBoundingClientRect() {
      return this.dataset.docked === "1"
        ? { left: 900, top: 500, width: 360, height: 280 }
        : { left: 440, top: 250, width: 400, height: 280 };
    },
    animate(frames, opt) {
      const a = { frames, opt };
      this.animations.push(a);
      return a;
    },
    show() { this.style.display = ""; },
    querySelector(sel) {
      const m = sel.match(/__item\[data-index="(\d+)"\]/);
      if (m) return rows[+m[1]];
      const k = sel.replace(".window-downloader__", "");
      return (els[k] = els[k] || node());
    },
  };
  const w = {
    ...methods,
    fig: { family: "window-downloader" },
    el,
    els,
    rows,
    attrs: { nodes },
    fed: null,
    gone: 0,
    raised: 0,
    mget(k) { return this.attrs[k]; },
    feed(s) { this.fed = s; },
    isDestroyed() { return !!this.gone; },
    goodbye() { this.gone = 1; },
    raise() { this.raised++; },
  };
  return w;
}

const settle = () => new Promise((r) => setTimeout(r, 30));

test("files stream through fetchFile with the window's progress — never row.download()", async () => {
  const a = row("a", 100, { chunks: [40, 60] });
  const b = row("b", 300, { chunks: [300] });
  const w = win([a, b]);
  w.downloadFiles();
  await settle();
  assert.deepEqual(a.calls, [["fetchFile", "/file/a", "a.txt"]]);
  assert.deepEqual(b.calls, [["fetchFile", "/file/b", "b.txt"]]);
  assert.equal(w.els["bar-fill"].style.width, "100%");
  assert.equal(w.els["meta-bytes"].textContent, "400B / 400B");
  assert.equal(w.els["files-title"].textContent, "Download complete");
  assert.equal(w.els.files.dataset.state, "done");
});

test("docks where the upload window sits once running, and stays open when done", async () => {
  const a = row("a", 10);
  const w = win([a]);
  w.downloadFiles();
  assert.equal(w.el.dataset.docked, "1");
  assert.equal(w.el.dataset.expanded, "1");
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(w.els.files.dataset.state, "done");
  assert.equal(w.gone, 0, "no auto-close on success");
});

test("the header x cancels a running download, and only closes a finished one", async () => {
  let release;
  const a = row("a", 10);
  a.aborter = { abort: () => { a.aborted = 1; release(); } };
  a.fetchFile = () => new Promise((r) => { release = r; });
  const w = win([a]);
  w.downloadFiles();
  await null;
  w.dismiss();
  assert.equal(a.aborted, 1, "running: the x cancels");
  assert.equal(w.gone, 1);

  const b = row("b", 10);
  const done = win([b]);
  done.downloadFiles();
  await settle();
  assert.equal(done.els.files.dataset.state, "done");
  done.dismiss();
  assert.equal(done.gone, 1, "done: the x just closes");
  assert.equal(b.aborted, undefined);
});

test("collapse folds the card to its header and back", () => {
  const w = win([]);
  w.el.dataset.expanded = "1";
  w.toggleExpand();
  assert.equal(w.el.dataset.expanded, "0");
  w.toggleExpand();
  assert.equal(w.el.dataset.expanded, "1");
});

test("every item gets its own row status and count, like upload's progress rows", async () => {
  const a = row("a", 100, { chunks: [40, 60] });
  const b = row("b", 200, { fail: true });
  const c = row("c", 300, { chunks: [300] });
  const w = win([a, b, c]);
  const seen = [];
  const paint = w._paintItem;
  w._paintItem = function (i, status, bytes) {
    paint.call(this, i, status, bytes);
    seen.push(`${i}:${status}:${this.rows[i].parts.meta.textContent}`);
  };
  w.downloadFiles();
  await settle();
  assert.deepEqual(w.rows.map((r) => r.dataset.status), ["done", "error", "done"]);
  assert.ok(seen.includes("0:downloading:40%"), seen.join(" "));
  assert.ok(seen.includes("0:downloading:100%"), seen.join(" "));
  assert.equal(w.rows[0].parts.meta.textContent, "", "settled rows drop the count");
  assert.equal(w.rows[1].parts.meta.textContent, "");
});

test("progress counts every byte across the selection", async () => {
  const a = row("a", 100, { chunks: [100] });
  const b = row("b", 100, { chunks: [50, 50] });
  const w = win([a, b]);
  const seen = [];
  const paint = w._paintFiles;
  w._paintFiles = function () {
    paint.call(this);
    if (this._files.index < 2) seen.push(this.els["meta-percent"].textContent);
  };
  w.downloadFiles();
  await settle();
  assert.ok(seen.includes("75%"), `saw ${seen.join(",")}`);
});

test("folders keep the server-zip path; files only are fetched", async () => {
  const f = row("folder", 0, { type: "folder" });
  const a = row("a", 10);
  const w = win([f, a]);
  w.downloadFiles();
  await settle();
  assert.deepEqual(f.calls, ["download"]);
  assert.equal(a.calls[0][0], "fetchFile");
});

test("a failed file keeps the card up and says so", async () => {
  const a = row("a", 10, { fail: true });
  const b = row("b", 10);
  const w = win([a, b]);
  w.downloadFiles();
  await settle();
  assert.equal(w.els.files.dataset.state, "failed");
  assert.equal(w.els["files-title"].textContent, "1 file(s) couldn't be downloaded");
  assert.equal(w.gone, 0);
  assert.equal(b.calls[0][0], "fetchFile", "the next file still downloads");
});

test("Cancel aborts the file in flight and stops the queue", async () => {
  let release;
  const a = row("a", 10);
  a.aborter = { abort: () => { a.aborted = 1; release(); } };
  a.fetchFile = (o) => new Promise((r) => { release = r; a.calls.push("fetchFile"); });
  const b = row("b", 10);
  const w = win([a, b]);
  w.downloadFiles();
  await null;
  w.abortFiles();
  await settle();
  assert.equal(a.aborted, 1);
  assert.deepEqual(b.calls, [], "the rest never starts");
  assert.equal(w.gone, 1);
});

test("show: the card rises in once", () => {
  const w = win([]);
  w._animateShow();
  w._animateShow();
  assert.equal(w.el.animations.length, 1, "only the first render animates");
  assert.match(w.el.animations[0].frames[0].transform, /translateY\(8px\)/);
});

test("switch: docking glides the card from the centre to the dock, the step fades in", () => {
  const w = win([]);
  const panel = { animations: [], animate(f, o) { this.animations.push({ f, o }); } };
  const qs = w.el.querySelector;
  w.el.querySelector = (sel) => (sel === ".window-downloader__panel" ? panel : qs.call(w.el, sel));
  w._dock();
  assert.equal(w.el.dataset.docked, "1");
  const glide = w.el.animations[0].frames[0].transform;
  assert.equal(glide, `translate(-460px, -250px) scale(${400 / 360})`);
  assert.equal(w.el.animations[0].frames[1].transform, "none");
  assert.equal(panel.animations.length, 1);
});

test("reduced motion: nothing animates", () => {
  globalThis.__win.matchMedia = () => ({ matches: true });
  try {
    const w = win([]);
    w._animateShow();
    w._dock();
    assert.equal(w.el.animations.length, 0);
    assert.equal(w.el.dataset.docked, "1", "it still docks");
  } finally {
    globalThis.__win.matchMedia = () => ({ matches: false });
  }
});

// goodbye() calls super.goodbye; swap that for a recorder to run it standalone.
const goodbyeSrc = sliceFunction(SRC, "goodbye(args)").replace(/super\.goodbye/g, "this.__super");
const goodbye = new Function("_", "DL_CLOSE_MS", `return ${goodbyeSrc}`)(_, 30);

function closing(docked) {
  const w = win([]);
  w.goodbye = goodbye;
  w.supers = [];
  w.__super = function (a) { this.supers.push(a); this.gone = 1; };
  if (docked) w.el.dataset.docked = "1";
  return w;
}

test("close: fades the card out, then removes it at once", async () => {
  const w = closing(true);
  w.goodbye();
  w.goodbye(); // a second close while leaving is ignored
  assert.equal(w.el.animations.length, 1);
  assert.equal(w.el.animations[0].frames[1].transform, "translateY(16px)", "docked: drops toward the dock");
  assert.deepEqual(w.supers, [], "not removed until the fade ends");
  w.el.animations[0].onfinish();
  assert.deepEqual(w.supers, [{ now: true }]);
  await new Promise((r) => setTimeout(r, 300)); // the safety timer must not fire twice
  assert.equal(w.supers.length, 1);
});

test("close: a centred card eases back; { now } skips the fade", () => {
  const w = closing(false);
  w.goodbye();
  assert.match(w.el.animations[0].frames[1].transform, /scale\(0\.97\)/);

  const n = closing(true);
  n.goodbye({ now: true });
  assert.equal(n.el.animations.length, 0);
  assert.deepEqual(n.supers, [{ now: true }]);
});

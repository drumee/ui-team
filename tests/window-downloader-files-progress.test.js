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
  PREPARING_DOWNLOAD: "Preparing download…",
  ALLOW_DOWNLOADS_TO_START: "Allow downloads to start",
  DOWNLOADING_IN_BROWSER: "Downloading in your browser",
};
const _a = new Proxy({ none: "none" }, { get: (t, k) => (k in t ? t[k] : String(k)) });
const _e = { close: "close", eod: "eod" };
// What the window saved (libs/save-held), and the zips the server is asked for.
const saved = [];
const saveHeld = function (blob, name) { saved.push([name, blob.size]); };
const SERVICE = { media: { download: "media.download", zip_release: "media.zip_release" } };
const Visitor = { get: () => "sock" };
global.bootstrap = () => ({ svc: "/svc/", keysel: "k" });
const location = { href: "https://box.test/-/", origin: "https://box.test" };
// The gate's own services, switched on by the gate tests only.
const GATE = { download_gate: "media.download_gate", download_gate_state: "media.download_gate_state" };
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
  "_isTree(v)",
  "async _saveTree(v, index, onProgress)",
  "_saveNative(url, filename)",
  "_awaitTreeZip(zipid, index)",
  "_settleTreeZip(result)",
  "async _prepareTree(v, index)",
  "async _gateFirstTwo()",
  "async _gateState(cancel)",
  "_gateCancel()",
  "_gateTitle(text)",
  "async _itemTarget(v, index)",
  "_canGate(list)",
  "_gateOrder(list)",
];
const methods = {};
for (const sig of names) {
  methods[sig.replace(/^async /, "").replace(/\(.*\)/, "")] = new Function(
    "_", "_a", "_e", "LOCALE", "filesize", "require", "window",
    "DL_SHOW_MS", "DL_SWITCH_MS", "DL_CLOSE_MS",
    "saveHeld", "SERVICE", "Visitor", "MAX_BLOB_SIZE", "TREE_TIMEOUT_MS",
    "GATE_POLL_MS", "GATE_WAIT_MS", "GATE_SECOND_MS", "location",
    `return ${sliceFunction(SRC, sig)}`,
  )(_, _a, _e, LOCALE, filesize, () => () => ({}), globalThis.__win, 200, 320, 180,
    saveHeld, SERVICE, Visitor, 100000000, 1000, 1, 80, 1, location);
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
      // Without `download`, fetchFile hands the blob back.
      return { size: loaded };
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
    warn() {},
    mset(o) { Object.assign(this.attrs, o); },
    posts: [],
    zips: {},
    async postService(o) {
      this.posts.push(o);
      if (o.service === "media.download") {
        return this.zips[o.filename] || { wait: 0, zipid: `z-${o.filename}`, zipname: o.filename, nid: o.nodes[0].nid, size: 50 };
      }
      if (o.service === "media.download_gate_state") {
        if (o.cancel) return { state: "cancel" };
        return { state: this.answers.shift() || "" };
      }
      return {};
    },
    // What the server answers while the browser's prompt is up.
    answers: [],
    // The browser's own downloads (a hidden anchor).
    natives: [],
    _saveNative(url, name) { this.natives.push([url, name]); },
    // The window's own fetch, for a folder's zip.
    async fetchFile(o) {
      this.fetched = (this.fetched || []).concat(o.url);
      o.progress.update({ loaded: 30 });
      return { size: 30 };
    },
  };
  return w;
}

const settle = () => new Promise((r) => setTimeout(r, 30));

test("files stream through fetchFile with the window's progress — never row.download()", async () => {
  saved.length = 0;
  const a = row("a", 100, { chunks: [40, 60] });
  const b = row("b", 300, { chunks: [300] });
  const w = win([a, b]);
  w.downloadFiles();
  await settle();
  assert.deepEqual(a.calls, [["fetchFile", "/file/a", undefined]], "fetched, not saved by the row");
  assert.deepEqual(b.calls, [["fetchFile", "/file/b", undefined]]);
  assert.deepEqual(saved.slice(-2), [["a.txt", 100], ["b.txt", 300]], "saved by the window, held for the permission prompt");
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

test("folders are zipped, fetched and saved by this window — never the row's own download", async () => {
  saved.length = 0;
  const f = row("rrr", 0, { type: "folder" });
  f.attrs.hub_id = "ws1";
  f.attrs.nid = "e2fa";
  const a = row("a", 10);
  const w = win([f, a]);
  w.downloadFiles();
  await settle();
  assert.deepEqual(f.calls, [], "no row download(): no progress mounted in the row");
  const zip = w.posts.find((p) => p.service === "media.download");
  assert.deepEqual([zip.hub_id, zip.nodes], ["ws1", [{ nid: "e2fa", hub_id: "ws1" }]]);
  assert.match(w.fetched[0], /media\.zip\?hub_id=ws1&nid=e2fa&id=z-rrr/);
  assert.deepEqual(saved, [["rrr.zip", 30], ["a.txt", 10]], "in order, by the window");
  assert.equal(w.rows[0].dataset.status, "done");
  assert.ok(w.posts.some((p) => p.service === "media.zip_release" && p.id === "z-rrr"));
});

test("a folder the server zips in the background is waited for in the window", async () => {
  saved.length = 0;
  const f = row("big", 0, { type: "folder" });
  const w = win([f]);
  w.zips.big = { wait: 1, zipid: "zBig", zipname: "big", nid: "n", size: 50 };
  w.handleDownload = new Function("LOCALE", "_e",
    `return ${sliceFunction(SRC, "async handleDownload(data)")}`)({}, {});
  w.downloadFiles();
  await settle();
  assert.equal(w.attrs.zipid, "zBig", "carries the zipid Wm routes the pushes by");
  assert.equal(w.rows[0].dataset.status, "downloading");
  assert.deepEqual(saved, []);
  await w.handleDownload({ zipid: "zBig", phase: "exit", exit: 0 });
  await settle();
  assert.deepEqual(saved, [["big.zip", 30]]);
});

function withGate(fn) {
  return async () => {
    Object.assign(SERVICE.media, GATE);
    try { await fn(); } finally { for (const k of Object.keys(GATE)) delete SERVICE.media[k]; }
  };
}
const gateParams = (u) => Object.fromEntries(new URL(u, location.href).searchParams);

test("two folders: nothing is saved until the browser's prompt is answered yes", withGate(async () => {
  saved.length = 0;
  const f1 = row("rrr", 0, { type: "folder" });
  const f2 = row("sss", 0, { type: "folder" });
  f1.attrs.hub_id = f2.attrs.hub_id = "ws1";
  f1.attrs.nid = "n1";
  f2.attrs.nid = "n2";
  const w = win([f1, f2]);
  w.answers = ["", "", ""]; // the user is still reading the prompt
  w.downloadFiles();
  await settle();
  assert.equal(w.els["files-title"].textContent, LOCALE.ALLOW_DOWNLOADS_TO_START);
  // The first parked on the server, the second raising the prompt.
  const [hold, open] = w.natives;
  assert.equal(hold[1], "rrr.zip");
  assert.equal(open[1], "sss.zip");
  const h = gateParams(hold[0]);
  const o = gateParams(open[0]);
  assert.equal(new URL(hold[0], location.href).pathname, "/svc/media.download_gate");
  assert.deepEqual([h.role, o.role, h.gate], ["hold", "open", o.gate]);
  assert.deepEqual([h.hub_id, h.nid, o.nid], ["ws1", "n1", "n2"]);
  assert.match(h.to, /^\/svc\/media\.zip\?hub_id=ws1&nid=n1&id=z-rrr/);
  assert.deepEqual(saved, [], "nothing saved while the prompt is up");
  assert.deepEqual(w.rows.map((r) => r.dataset.status), ["waiting", "waiting"]);
  w.answers.push("open"); // yes
  await new Promise((r) => setTimeout(r, 60));
  // Checked at once; but the browser has them, so no "Download complete, 100%".
  assert.deepEqual([w.rows[0].dataset.status, w.rows[1].dataset.status], ["done", "done"]);
  assert.equal(w.els.files.dataset.state, "browser");
  assert.equal(w.els["files-title"].textContent, "Downloading in your browser");
  assert.notEqual(w.els["meta-percent"].textContent, "100%");
  assert.equal(w.gone, 0);
  assert.equal(w.natives.length, 2, "each folder downloaded once, by the browser");
}));

test("on yes, the rest of the selection follows with its progress here", withGate(async () => {
  saved.length = 0;
  const w = win([row("a", 10), row("b", 20), row("c", 30)]);
  w.answers = ["open"];
  w.downloadFiles();
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(w.natives.map((n) => [gateParams(n[0]).to, n[1]]), [["/file/a", "a.txt"], ["/file/b", "b.txt"]]);
  assert.deepEqual(saved, [["c.txt", 30]]);
  // Once the window has the rest, the browser's two small files are checked
  // and counted too.
  assert.deepEqual(w.rows.map((r) => r.dataset.status), ["done", "done", "done"]);
  assert.equal(w.els["meta-bytes"].textContent, "60B / 60B");
  assert.equal(w.els.files.dataset.state, "done");
}));

test("while the prompt is up every row waits; the browser takes the two smallest files", withGate(async () => {
  saved.length = 0;
  const big = row("big", 3000, { chunks: [1500, 1500] });
  const w = win([big, row("s1", 10), row("s2", 20)]);
  w.answers = ["", ""];
  let percentAtYes;
  w.downloadFiles();
  await settle();
  assert.deepEqual(w.rows.map((r) => r.dataset.status), ["waiting", "waiting", "waiting"]);
  assert.deepEqual(w.rows.map((r) => r.parts.meta && r.parts.meta.textContent), ["", "", ""], "no 0% on a waiting row");
  // Listed first, the pair the browser downloads itself.
  assert.deepEqual(w._files.list.map((v) => v.name), ["s1", "s2", "big"]);
  assert.deepEqual(w.natives.map((n) => n[1]), ["s1.txt", "s2.txt"]);
  // The big file goes through this window, with its progress — the bar is
  // not at 100% as soon as the user says yes.
  let rowsAtYes;
  big.fetchFile = async function (o) {
    percentAtYes = w.els["meta-percent"].textContent;
    rowsAtYes = w.rows.map((r) => r.dataset.status);
    o.progress.update({ loaded: 1500 });
    await null;
    o.progress.update({ loaded: 3000 });
    return { size: 3000 };
  };
  w.answers.push("open");
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(percentAtYes, "0%");
  assert.deepEqual(rowsAtYes, ["done", "done", "downloading"], "the browser's two are checked while the rest downloads");
  assert.deepEqual(saved, [["big.txt", 3000]]);
  assert.equal(w.els["meta-percent"].textContent, "100%");
}));

test("no answer (or no): the gate is given up and everything closes, nothing saved", withGate(async () => {
  saved.length = 0;
  const w = win([row("a", 10), row("b", 20), row("c", 30)]);
  w.downloadFiles();
  await new Promise((r) => setTimeout(r, 150)); // past GATE_WAIT_MS
  assert.ok(w.posts.some((p) => p.service === "media.download_gate_state" && p.cancel === 1));
  assert.equal(w.gone, 1, "closed");
  assert.deepEqual(saved, []);
}));

test("Cancel while the prompt is up gives the gate up and closes", withGate(async () => {
  const w = win([row("a", 10), row("b", 20)]);
  w.downloadFiles();
  await settle();
  w.abortFiles();
  assert.ok(w.posts.some((p) => p.service === "media.download_gate_state" && p.cancel === 1));
  assert.equal(w.gone, 1);
  await settle();
  assert.equal(w.natives.length, 2);
}));

test("one item needs no gate: the page's free download is enough", withGate(async () => {
  saved.length = 0;
  const w = win([row("a", 10)]);
  w.downloadFiles();
  await settle();
  assert.deepEqual(w.natives, []);
  assert.deepEqual(saved, [["a.txt", 10]]);
}));

test("a file elsewhere than this origin cannot be gated: saved as before", withGate(async () => {
  saved.length = 0;
  const a = row("a", 10);
  a.actualNode = () => ({ url: "https://cdn.other.test/a" });
  const w = win([a, row("b", 20)]);
  w.downloadFiles();
  await settle();
  assert.deepEqual(w.natives, []);
  assert.deepEqual(saved, [["a.txt", 10], ["b.txt", 20]]);
}));

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

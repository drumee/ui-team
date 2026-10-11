// window-downloader-zip.test.js — the .zip step reaches its result, drawn like
// the multiple-files step.
//
//   node --test tests/window-downloader-zip.test.js
//
// Below 5 MB the server answers media.download with wait:0 and the archive is
// fetched at once. The card waited for an `eod` that fetchFile never fires when
// it saves (it only does when NOT given a download name) — so it sat on
// "Loading" forever. The card is now the multiple-files one (skeleton/rows.js):
// the bar with its bytes and percentage, and one row, the archive's. Runs the
// real downloadZip / _zipDone / _zipPaint / _zipItem / handleDownload.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(path.join(__dirname, "../src/drumee/builtins/window/downloader/index.js"), "utf8")
  .replace(/\r\n/g, "\n");

if (!String.prototype.format) {
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] != null ? args[i] : m));
  };
}
const LOCALE = {
  DOWNLOADING: "Downloading",
  DOWNLOAD_COMPLETE: "Download complete",
  DOWNLOAD_FAILED: "Download failed",
  DOWNLOADING_IN_BROWSER: "Downloading in your browser",
  CANCELED: "Operation canceled!",
};
const SERVICE = { media: { zip_release: "media.zip_release" } };
const filesize = (n) => `${n}B`;
const load = (sig) =>
  new Function(
    "_", "_a", "_e", "LOCALE", "SERVICE", "MAX_BLOB_SIZE", "filesize", "ARCHIVE_PREP_SHARE", "Dayjs",
    `return ${sliceFunction(SRC, sig)}`,
  )(_, { content: "content" }, { close: "close" }, LOCALE, SERVICE, 100000000, filesize, 10,
    () => ({ format: () => "drumee-today" }));

const methods = {
  downloadZip: load("async downloadZip(data)"),
  _zipDone: load("_zipDone(data, res)"),
  _zipSettle: load("_zipSettle(o)"),
  _setZipTitle: load("_setZipTitle(text)"),
  _zipPaint: load("_zipPaint(v, reset)"),
  _zipItem: load("_zipItem(status, zipname)"),
  _zipLabel: load("_zipLabel()"),
  _archivePercent: load("_archivePercent(progress, message)"),
  handleDownload: load("async handleDownload(data)"),
};

function part() {
  return {
    calls: [],
    gone: 0,
    isDestroyed() { return !!this.gone; },
    set(o) { this.calls.push(["set", o]); },
    mset(o) { this.calls.push(["mset", o]); },
    suppress() { this.gone = 1; },
  };
}

// The card's DOM (skeleton/progress.js): the bar, its two labels, one row.
function card() {
  const node = () => ({ textContent: "", style: {}, dataset: {} });
  const els = {};
  const row = { ...node(), dataset: { status: "waiting" }, parts: {} };
  row.querySelector = (sel) => {
    const k = sel.replace(".window-downloader__", "");
    return (row.parts[k] = row.parts[k] || node());
  };
  const main = { dataset: { state: "running" } };
  return {
    els,
    row,
    main,
    querySelector(sel) {
      if (sel === ".window-downloader__zip") return main;
      if (sel === ".window-downloader__item") return row;
      if (sel === ".window-downloader__item-meta") return row.querySelector(sel);
      const k = sel.replace(".window-downloader__", "");
      return (els[k] = els[k] || node());
    },
  };
}

function win(result) {
  const el = card();
  const w = {
    ...methods,
    fig: { family: "window-downloader" },
    _zipsize: 1000,
    _running: 1,
    _token: "tok",
    el,
    posted: [],
    raised: 0,
    attrs: {},
    __btnCancel: part(),
    __btnStatus: part(),
    __btnAction: part(),
    mget(k) { return this.attrs[k]; },
    isDestroyed: () => false,
    warn() {},
    raise() { this.raised++; },
    postService(o) { this.posted.push(o); },
    download_zip(o) {
      this.fetched = o;
      return typeof result === "function" ? result(o) : Promise.resolve(result);
    },
  };
  return w;
}
const pct = (w) => w.el.els["meta-percent"].textContent;
const bytes = (w) => w.el.els["meta-bytes"].textContent;
const fill = (w) => w.el.els["bar-fill"].style.width;
const titles = (w) => w.__btnStatus.calls.map((c) => c[1].content);

const data = { zipid: "z1", zipname: "abc-2026-10-08-1700" };

test("a saved archive ends on Download complete: full bar, its row checked, the copy released", async () => {
  const w = win(undefined); // fetchFile resolves undefined once getBlob saved it
  await w.downloadZip(data);
  assert.equal(typeof w.fetched.progress.update, "function");
  assert.equal(w.el.row.parts["item-name"].textContent, "abc-2026-10-08-1700.zip");
  assert.equal(w.el.row.dataset.status, "done");
  assert.deepEqual([fill(w), pct(w), bytes(w)], ["100%", "100%", "1000B / 1000B"]);
  assert.equal(w.el.main.dataset.state, "done");
  assert.equal(w._running, 0);
  assert.equal(w.__btnCancel.gone, 1);
  assert.deepEqual(titles(w), ["Downloading", "Download complete"]);
  assert.deepEqual(w.__btnAction.calls, [["mset", { service: "close" }]]);
  assert.deepEqual(w.posted, [{ service: "media.zip_release", id: "z1", token: "tok" }]);
});

test("while it is fetched: the bytes, the percentage, and the row's own count", async () => {
  let seen;
  const w = win((o) => {
    o.progress.update({ loaded: 250, total: 1000 });
    seen = [fill(w), pct(w), bytes(w), w.el.row.dataset.status, w.el.row.parts["item-meta"].textContent];
    return Promise.resolve();
  });
  await w.downloadZip(data);
  assert.deepEqual(seen, ["25%", "25%", "250B / 1000B", "downloading", "25%"]);
});

test("an archive the server cannot serve ends on Download failed, its row in error", async () => {
  const w = win({ error: 404 });
  await w.downloadZip(data);
  assert.equal(w.el.main.dataset.state, "failed");
  assert.equal(w.el.row.dataset.status, "error");
  assert.equal(titles(w).at(-1), "Download failed");
  assert.notEqual(pct(w), "100%", "no full bar");
  assert.deepEqual(w.posted, [], "nothing released");
});

test("an aborted fetch says so", async () => {
  const w = win(() => Promise.reject("aborted"));
  await w.downloadZip(data);
  assert.equal(w.el.main.dataset.state, "failed");
  assert.equal(titles(w).at(-1), "Operation canceled!");
});

test("a second call while downloading is ignored", async () => {
  let n = 0;
  const w = win(() => { n++; return Promise.resolve(); });
  await Promise.all([w.downloadZip(data), w.downloadZip(data)]);
  assert.equal(n, 1);
});

// ---- media.zip is asked for the node on ITS OWN hub ------------------------
// Stage 2026-10-09 (s110): download() answered nid = the first selected node
// (workspace ff7469e5ff7469ea) next to hub_id = the request's hub (the personal
// 6fadbdf56fadbdfb); media.zip on that pair → PERMISSION_DENIED.
const zipSource = new Function(
  "_a", "Visitor",
  `return ${sliceFunction(SRC, "_zipSource(o = {})")}`,
)({ nid: "nid", hub_id: "hub_id", home_id: "home_id", id: "id" }, {
  get: (k) => ({ home_id: "HOME", id: "ME" })[k],
});
const PERSONAL = "6fadbdf56fadbdfb";
const WS = "ff7469e5ff7469ea";

function src(nodes, attrs = {}) {
  return {
    _zipSource: zipSource,
    _api: { nodes, nid: 0, hub_id: PERSONAL },
    mget: (k) => attrs[k],
  };
}

test("desk selection: the answered nid is asked for on its own workspace", () => {
  const w = src([
    { nid: "e2fa0755e2fa0758", hub_id: WS },
    { nid: "aaaa000000000001", hub_id: WS },
  ]);
  assert.deepEqual(
    w._zipSource({ nid: "e2fa0755e2fa0758", hub_id: PERSONAL }),
    { nid: "e2fa0755e2fa0758", hub_id: WS },
  );
});

test("share: node and hub already agree, nothing changes", () => {
  const SHARE = "5bae00005bae0001";
  const w = src([{ nid: "n1", hub_id: SHARE }]);
  assert.deepEqual(w._zipSource({ nid: "n1", hub_id: SHARE }), { nid: "n1", hub_id: SHARE });
});

test("a nid the selection does not list keeps the answered hub", () => {
  const w = src([{ nid: "x", hub_id: WS }]);
  assert.deepEqual(w._zipSource({ nid: "other", hub_id: PERSONAL }), { nid: "other", hub_id: PERSONAL });
});

test("download_zip builds media.zip on the node's own hub", () => {
  global.bootstrap = () => ({ svc: "/-/huan/svc/", keysel: "regsid" });
  const downloadZip = new Function(
    "_a", "Visitor", "Dayjs",
    `return ${sliceFunction(SRC, "download_zip(o = {})")}`,
  )({ nid: "nid", hub_id: "hub_id", filename: "filename" }, { get: () => null }, () => ({ format: () => "drumee" }));
  const w = src([{ nid: "e2fa0755e2fa0758", hub_id: WS }]);
  w.download_zip = downloadZip;
  w._token = "";
  w.fetchFile = (o) => o;
  const o = w.download_zip({
    nid: "e2fa0755e2fa0758", hub_id: PERSONAL, zipid: "ZkhRWyfaEIrkJbe0eEQXg",
    zipname: "drumee-2026-10-09-2026-10-09-0018",
  });
  assert.match(o.url, new RegExp(`hub_id=${WS}&nid=e2fa0755e2fa0758&id=ZkhRWyfaEIrkJbe0eEQXg`));
  assert.equal(o.download, "drumee-2026-10-09-2026-10-09-0018.zip");
});

// ---- Over 100 MB: the browser downloads, the SAME card says so -------------
// getFromUrl used to close this card and open Wm.downloadNotice — a second
// card with a simulated bar that parks near 90%.
test("a large archive hands off to the browser and settles in this card", async () => {
  global.bootstrap = () => ({ svc: "/svc/", keysel: "k" });
  const getFromUrl = new Function(
    "_a", "LOCALE", "Wm",
    `return ${sliceFunction(SRC, "getFromUrl(opt)").replace(/super\.getFromUrl/g, "this.__nativeGet")}`,
  )({}, LOCALE, { downloadNotice() { throw new Error("no second card"); } });
  const w = win(undefined);
  w.getFromUrl = getFromUrl;
  w._zipSource = () => ({ nid: "n", hub_id: "h" });
  w.goodbye = () => { w.gone = 1; };
  w.__nativeGet = (url) => { w.native = url; };
  w.getFromUrl({ zipid: "big", zipname: "drumee-2026-10-09-0223" });
  assert.match(w.native, /media\.zip\?hub_id=h&nid=n&id=big/);
  assert.equal(w.gone, undefined, "the card stays");
  // Its row checked; no bar (the skin hides it on data-state=browser).
  assert.equal(w.el.row.dataset.status, "done");
  assert.equal(w.el.row.parts["item-name"].textContent, "drumee-2026-10-09-0223.zip");
  assert.equal(w.el.main.dataset.state, "browser");
  assert.deepEqual(titles(w), ["Downloading in your browser"]);
  assert.equal(w._running, 0);
  assert.deepEqual(w.posted, [], "not released: the browser is still fetching it");
});

// ---- The percentage: one number, only going up ------------------------------
test("the percentage only goes up, and a new transfer starts again", () => {
  const w = win(undefined);
  w._zipPaint({ loaded: 0, total: 1000 }, true);
  assert.equal(pct(w), "0%");
  w._zipPaint({ loaded: 250, total: 1000 });
  assert.equal(pct(w), "25%");
  w._zipPaint(60);
  assert.equal(pct(w), "60%");
  w._zipPaint(40); // never backwards
  assert.equal(pct(w), "60%");
  w._zipPaint(150);
  assert.equal(pct(w), "100%");
  w._zipPaint({ loaded: 0, total: 1000 }, true);
  assert.equal(pct(w), "0%");
});

// ---- The worker's two 0→100 runs, on one rising scale -----------------------
// offline/media/download.js reports IN_PREPARATION (fast, per linked file) and
// then BEING_CREATED (7z, the long part), each 0→100. Straight to the bar, the
// label sat on 100% for the whole compression.
test("archive progress rises once across preparation and compression; the row spins", async () => {
  const w = win(undefined);
  const shown = [];
  const run = [
    ...[25, 50, 75, 100].map((p) => ({ phase: "archive", message: "IN_PREPARATION", progress: p })),
    ...[3, 40, 80, 100].map((p) => ({ phase: "archive", message: "BEING_CREATED", progress: p })),
  ];
  for (const d of run) {
    await w.handleDownload(d);
    shown.push(pct(w));
  }
  assert.deepEqual(shown, ["2%", "5%", "7%", "10%", "12%", "46%", "82%", "100%"]);
  assert.equal(w.el.row.dataset.status, "waiting");
  assert.equal(bytes(w), "", "no byte count while the server builds it");
  assert.deepEqual(titles(w), ["IN_PREPARATION", "BEING_CREATED"], "the phase text, once each");
});

test("the archive ready, the fetch starts again from 0 with its bytes", async () => {
  const w = win(() => new Promise(() => {})); // still fetching
  await w.handleDownload({ phase: "archive", message: "BEING_CREATED", progress: 100 });
  assert.equal(pct(w), "100%");
  await w.handleDownload({ phase: "exit", zipid: "z1", zipname: "abc" });
  assert.deepEqual([pct(w), bytes(w), w.el.row.dataset.status], ["0%", "0B / 1000B", "downloading"]);
  assert.equal(w.el.row.parts["item-name"].textContent, "abc.zip");
});

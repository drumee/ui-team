// window-downloader-zip.test.js — the .zip step reaches its result.
//
//   node --test tests/window-downloader-zip.test.js
//
// Below 5 MB the server answers media.download with wait:0 and the archive is
// fetched at once. The card waited for an `eod` that fetchFile never fires when
// it saves (it only does when NOT given a download name), and its progress bar
// was only resolved for the server's >5 MB progress pushes — so it sat on
// "Loading" forever. Runs the real downloadZip / _zipDone / _ensureProgress.
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
  HAS_BEEN_SAVED: "{0} has been saved successfully.",
  DOWNLOAD_COMPLETE: "Download complete",
  DOWNLOAD_FAILED: "Download failed",
  CANCELED: "Operation canceled!",
};
const SERVICE = { media: { zip_release: "media.zip_release" } };
const load = (sig) =>
  new Function(
    "_", "_a", "_e", "LOCALE", "SERVICE", "MAX_BLOB_SIZE",
    `return ${sliceFunction(SRC, sig)}`,
  )(_, { content: "content" }, { close: "close" }, LOCALE, SERVICE, 100000000);

const methods = {
  downloadZip: load("async downloadZip(data)"),
  _zipDone: load("_zipDone(data, res)"),
  _ensureProgress: load("_ensureProgress()"),
  _zipSettle: new Function("_e", `return ${sliceFunction(SRC, "_zipSettle(o)")}`)({ close: "close" }),
  _progress: load("_progress(method, ...args)"),
  _hasProgress: load("_hasProgress()"),
  _paintPercent: load("_paintPercent(v, reset)"),
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

function win(result, { progress = true } = {}) {
  const bar = {
    calls: [],
    __total: { text: "", set(k, v) { this.text = v; } },
    update(v) { this.calls.push(["update", v]); },
    setLabel(l) { this.calls.push(["label", l]); },
    restart(...a) { this.calls.push(["restart", ...a]); },
  };
  const main = { dataset: { state: "running" } };
  const w = {
    ...methods,
    fig: { family: "window-downloader" },
    _zipsize: 1234,
    _running: 1,
    _token: "tok",
    bar,
    main,
    posted: [],
    raised: 0,
    __btnCancel: part(),
    __btnStatus: part(),
    __btnAction: part(),
    el: { querySelector: (s) => (s === ".window-downloader__zip" ? main : null) },
    isDestroyed: () => false,
    warn() {},
    raise() { this.raised++; },
    postService(o) { this.posted.push(o); },
    // No progress resolved up front: the wait:0 path never ran handleDownload.
    ensurePart: () => Promise.resolve(progress ? bar : {}),
    download_zip(o) {
      this.fetched = o;
      return typeof result === "function" ? result() : Promise.resolve(result);
    },
  };
  return w;
}

const data = { zipid: "z1", zipname: "abc-2026-10-08-1700" };

test("a saved archive ends on Download complete, with Close and the copy released", async () => {
  const w = win(undefined); // fetchFile resolves undefined once getBlob saved it
  await w.downloadZip(data);
  // The bar is wired even without server pushes — through _progress.
  assert.equal(typeof w.fetched.progress.update, "function");
  assert.deepEqual(w.bar.calls[0], ["label", data.zipname]);
  assert.deepEqual(w.bar.calls.find((c) => c[0] === "update"), ["update", 100]);
  assert.deepEqual(w.bar.calls.at(-1), ["label", "abc-2026-10-08-1700.zip has been saved successfully."]);
  assert.equal(w.main.dataset.state, "done");
  assert.equal(w._running, 0);
  assert.equal(w.__btnCancel.gone, 1);
  assert.deepEqual(w.__btnStatus.calls, [["set", { content: "Download complete" }]]);
  assert.deepEqual(w.__btnAction.calls, [["mset", { service: "close" }]]);
  assert.deepEqual(w.posted, [{ service: "media.zip_release", id: "z1", token: "tok" }]);
});

test("an archive the server cannot serve ends on Download failed and keeps it", async () => {
  const w = win({ error: 404 });
  await w.downloadZip(data);
  assert.equal(w.main.dataset.state, "failed");
  assert.deepEqual(w.__btnStatus.calls, [["set", { content: "Download failed" }]]);
  assert.deepEqual(w.bar.calls.at(-1), ["label", "Download failed"]);
  assert.equal(w.bar.calls.some((c) => c[0] === "update"), false, "no full bar");
  assert.deepEqual(w.posted, [], "nothing released");
});

test("an aborted fetch says so", async () => {
  const w = win(() => Promise.reject("aborted"));
  await w.downloadZip(data);
  assert.equal(w.main.dataset.state, "failed");
  assert.deepEqual(w.bar.calls.at(-1), ["label", "Operation canceled!"]);
});

test("no progress_bar in this bundle: the result still lands", async () => {
  const w = win(undefined, { progress: false });
  await w.downloadZip(data);
  assert.equal(w.fetched.progress, undefined);
  assert.equal(w.main.dataset.state, "done");
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
  const L = { ...LOCALE, DOWNLOAD_SAVING_IN_BROWSER: "Saving to your browser's downloads" };
  const getFromUrl = new Function(
    "_a", "LOCALE", "Wm",
    `return ${sliceFunction(SRC, "getFromUrl(opt)").replace(/super\.getFromUrl/g, "this.__nativeGet")}`,
  )({}, L, { downloadNotice() { throw new Error("no second card"); } });
  const settle = new Function("_e", `return ${sliceFunction(SRC, "_zipSettle(o)")}`)({ close: "close" });
  const w = win(undefined);
  w.getFromUrl = getFromUrl;
  w._zipSettle = settle;
  w._zipSource = () => ({ nid: "n", hub_id: "h" });
  w.mget = () => undefined;
  w.goodbye = () => { w.gone = 1; };
  w.__nativeGet = (url) => { w.native = url; };
  w.getFromUrl({ zipid: "big", zipname: "drumee-2026-10-09-0223" });
  await new Promise((r) => setTimeout(r, 0));
  assert.match(w.native, /media\.zip\?hub_id=h&nid=n&id=big/);
  assert.equal(w.gone, undefined, "the card stays");
  assert.equal(w.main.dataset.state, "done");
  assert.deepEqual(w.__btnStatus.calls, [["set", { content: "drumee-2026-10-09-0223.zip" }]]);
  assert.deepEqual(w.bar.calls.at(-1), ["label", "Saving to your browser's downloads"]);
  assert.deepEqual(w.bar.calls.find((c) => c[0] === "update"), ["update", 100]);
  assert.equal(w._running, 0);
  assert.deepEqual(w.posted, [], "not released: the browser is still fetching it");
});

// ---- The number beside the bar: one ascending percentage, on the right ------
test("the right label is the percentage, and it only goes up", async () => {
  const w = win(undefined);
  w.__progress = w.bar;
  w._progress("restart", 1000, 0);
  assert.equal(w.bar.__total.text, "0%");
  w._progress("update", { loaded: 250, total: 1000 }); // fetchFile bytes
  assert.equal(w.bar.__total.text, "25%");
  w._progress("update", 60); // server archive phase
  assert.equal(w.bar.__total.text, "60%");
  w._progress("update", 40); // never backwards
  assert.equal(w.bar.__total.text, "60%");
  w._progress("update", 150);
  assert.equal(w.bar.__total.text, "100%");
  w._progress("restart", 1000, 0); // a new transfer starts again
  assert.equal(w.bar.__total.text, "0%");
});

test("the in-page fetch reports through _progress", async () => {
  let progress;
  const w = win(() => {
    progress.update({ loaded: 30, total: 120 });
    return Promise.resolve();
  });
  const dz = w.download_zip;
  w.download_zip = function (o) { progress = o.progress; return dz.call(this, o); };
  await w.downloadZip(data);
  assert.ok(w.bar.calls.some((c) => c[0] === "update" && c[1] && c[1].loaded === 30));
  assert.equal(w.bar.__total.text, "100%", "and ends full");
});

// ---- The worker's two 0→100 runs, on one rising scale -----------------------
// offline/media/download.js reports IN_PREPARATION (fast, per linked file) and
// then BEING_CREATED (7z, the long part), each 0→100. Straight to the bar, the
// label sat on 100% for the whole compression.
test("archive progress rises once across preparation and compression", async () => {
  const archivePercent = new Function(
    "ARCHIVE_PREP_SHARE", `return ${sliceFunction(SRC, "_archivePercent(progress, message)")}`,
  )(10);
  const handleDownload = new Function(
    "LOCALE", "_e", `return ${sliceFunction(SRC, "async handleDownload(data)")}`,
  )({}, {});
  const w = win(undefined);
  w.__progress = w.bar;
  w._archivePercent = archivePercent;
  w.handleDownload = handleDownload;
  w.__btnStatus = part();
  const shown = [];
  const run = [
    ...[25, 50, 75, 100].map((p) => ({ phase: "archive", message: "IN_PREPARATION", progress: p })),
    ...[3, 40, 80, 100].map((p) => ({ phase: "archive", message: "BEING_CREATED", progress: p })),
  ];
  for (const d of run) {
    await w.handleDownload(d);
    shown.push(w.bar.__total.text);
  }
  assert.deepEqual(shown, ["2%", "5%", "7%", "10%", "12%", "46%", "82%", "100%"]);
  const widths = w.bar.calls.filter((c) => c[0] === "update").map((c) => c[1]);
  assert.ok(widths.every((v, i) => i === 0 || v >= widths[i - 1]), `bar never goes back: ${widths}`);
});

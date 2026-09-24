/**
 * Background warm-up of the office editor (the `doc_editor` plugin, euroffice
 * / ONLYOFFICE) so the FIRST document a person opens does not sit on a
 * multi-megabyte download: the editor bundle is ~3.6 MB gzipped (sdk-all.js
 * alone 2.4 MB), which on a slow link is 20 s+ of "Loading document".
 *
 * Why an iframe and not a prefetch: the editor runs in an iframe on the
 * document-server origin, and Chrome keys its HTTP cache by (top-level site,
 * frame site, URL). A <link rel=prefetch> or fetch() from the desk lands in
 * the desk's own partition, which the editor iframe never reads. Loading the
 * editor page itself in a hidden iframe on the docserver origin fills the right
 * partition. Measured: with no config message the page still pulls app.js,
 * sdk-all-min.js, the locale and sdk-all.js, and opens NO docserver session.
 * Fonts are document-driven and stay out of scope here.
 *
 * Budget: desktop only, not on saveData / 2g links, START_DELAY_MS after the
 * desk settled, one editor at a time (word, cell, slide), never while a real
 * editor is open, and once per docserver version per browser (localStorage),
 * re-checked at most once a day.
 */
const STORE_KEY = "drumee.office.warmup";
const KINDS = ["word", "cell", "slide"];
const START_DELAY_MS = 15 * 1000;       // let the desk finish its own boot traffic
const LOAD_TO_SDK_MS = 60 * 1000;       // sdk-all.js arrives well after the page's load event on slow links
const HARD_CAP_MS = 90 * 1000;          // whatever happens, one editor never holds the slot longer
const RECHECK_MS = 24 * 3600 * 1000;    // do not even ask the server more often than this
const REDO_AFTER_MS = 7 * 24 * 3600 * 1000;

let _running = false;

/** The plugin's service namespace, when this endpoint has an editor with an assets service. */
function editorNs() {
  const editor = typeof Platform !== "undefined" && Platform.get && Platform.get("doc_editor");
  const ns = editor && typeof SERVICE !== "undefined" && SERVICE && SERVICE[editor];
  return ns && ns.assets ? { editor, service: ns.assets } : null;
}

function eligible() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof Visitor === "undefined") return false;
  if (Visitor.inDmz) return false;
  if (typeof Visitor.isMobile === "function" && Visitor.isMobile()) return false;
  const c = navigator.connection;
  if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return false;
  return true;
}

function readMark() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function writeMark(mark) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(mark));
  } catch (e) { /* private mode: warm anyway, just without the memory */ }
}

/** Same language rule as the document player, so the cached locale is the one the editor will ask for. */
function editorLang() {
  let lang = typeof Visitor.language === "function" ? Visitor.language() : "en";
  if (!/^(en|fr|es|ru|km|zh)$/.test(lang)) lang = "en";
  return lang;
}

/** The document player embeds `<svc>/<editor>.html`; leave the bandwidth to it. */
function realEditorOpen(editor) {
  return !!document.querySelector(`iframe[src*="${editor}.html"]`);
}

/** Load one editor page in a hidden iframe, then remove it. Resolves when the slot is free. */
function warmOne(url) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText =
      "position:fixed;width:2px;height:2px;left:-10px;top:-10px;opacity:0;pointer-events:none;border:0";
    let settled = false;
    let timer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("pagehide", finish);
      try { frame.remove(); } catch (e) { /* already gone */ }
      resolve();
    };
    // The page's load event fires before the SDK (loaded by app.js) is fetched:
    // give it LOAD_TO_SDK_MS more, under a hard cap.
    frame.addEventListener("load", () => {
      clearTimeout(timer);
      timer = setTimeout(finish, LOAD_TO_SDK_MS);
    });
    timer = setTimeout(finish, HARD_CAP_MS);
    window.addEventListener("pagehide", finish);
    frame.src = url;
    document.body.appendChild(frame);
  });
}

async function run(host) {
  if (_running) return;
  _running = true;
  try {
    const ns = editorNs();
    if (!ns || !host || typeof host.fetchService !== "function") return;
    const res = await host.fetchService(ns.service, { hub_id: Visitor.get(_a.id) });
    const data = (res && res.data) || res || {};
    const editors = data.editors || {};
    const version = data.version || null;
    const mark = readMark();
    if (mark && mark.version === version && Date.now() - (mark.time || 0) < REDO_AFTER_MS) return;
    const lang = editorLang();
    for (const kind of KINDS) {
      const url = editors[kind];
      if (!url) continue;
      // A real editor is on screen: stop, leave the mark unset so the next boot
      // finishes the job.
      if (realEditorOpen(ns.editor)) return;
      await warmOne(`${url}?lang=${lang}&type=desktop&frameEditorId=drumee-warmup`);
    }
    writeMark({ version, time: Date.now() });
  } catch (e) {
    if (host && typeof host.warn === "function") host.warn("[office-warmup]", e && e.message);
  } finally {
    _running = false;
  }
}

/**
 * Arm the warm-up from the desk once home has settled.
 * @param {*} host any widget with fetchService (the desk module)
 */
function schedule(host) {
  if (!eligible() || !editorNs()) return;
  const mark = readMark();
  if (mark && Date.now() - (mark.time || 0) < RECHECK_MS) return;
  const go = () => run(host);
  setTimeout(() => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(go, { timeout: 30 * 1000 });
    } else {
      go();
    }
  }, START_DELAY_MS);
}

module.exports = { schedule };

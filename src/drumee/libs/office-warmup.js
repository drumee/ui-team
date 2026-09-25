/**
 * Background warm-up of the office editor (the `doc_editor` plugin, euroffice
 * / ONLYOFFICE) so the FIRST document a person opens does not sit on a
 * multi-megabyte download: the editor bundle is ~3.6 MB gzipped (sdk-all.js
 * alone 2.4 MB) and a spreadsheet's default font set another ~3.5 MB, which
 * on a slow link is a minute of "Loading document".
 *
 * Why an iframe and not a prefetch: the editor runs in an iframe on the
 * document-server origin, and Chrome keys its HTTP cache (and the docserver's
 * service-worker cache) by (top-level site, frame site). A prefetch from the
 * desk lands in the desk's own partition, which the editor never reads. Only
 * a hidden frame that really runs the editor fills the right one.
 *
 * Two flavours, best first:
 *  - `<editor>.preload?name=<template>`: the plugin's own read-only page for a
 *    blank template. It opens a real (view-only) document, so the SDK AND the
 *    default fonts land in the cache. Costs one short viewer session on the
 *    docserver per editor kind.
 *  - the bare editor page on the docserver (`assets.editors`): SDK only, no
 *    docserver session. Used when the plugin has no preload / templates.
 *
 * Budget: desktop only, not on saveData / 2g, START_DELAY_MS after the desk
 * settled and on an idle callback, one editor kind at a time (word, cell,
 * slide), each given a dwell after its load event under a hard cap, ABORTED
 * the moment a real editor opens (it must not compete for the link), and
 * once per docserver version per browser (localStorage, re-checked daily).
 */
const STORE_KEY = "drumee.office.warmup";
const KINDS = ["word", "cell", "slide"];
const START_DELAY_MS = 15 * 1000;        // let the desk finish its own boot traffic
const DWELL_AFTER_LOAD_MS = 75 * 1000;   // fonts arrive well after the page's load event on slow links
const HARD_CAP_MS = 120 * 1000;          // whatever happens, one editor never holds the slot longer
const WATCH_EVERY_MS = 1500;             // how often a running warm-up looks for a real editor
const RECHECK_MS = 24 * 3600 * 1000;     // do not even ask the server more often than this
const REDO_AFTER_MS = 7 * 24 * 3600 * 1000;

let _running = false;

/** The plugin's service namespace, when this endpoint has an editor with an assets service. */
function editorNs() {
  const editor = typeof Platform !== "undefined" && Platform.get && Platform.get("doc_editor");
  const ns = editor && typeof SERVICE !== "undefined" && SERVICE && SERVICE[editor];
  return ns && ns.assets ? { editor, service: ns.assets, hasPreload: !!ns.preload } : null;
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

/** The document player embeds `<svc>/<editor>.html`; our own frames use `.preload`, so this is only theirs. */
function realEditorOpen(editor) {
  return !!document.querySelector(`iframe[src*="${editor}.html"]`);
}

/** Same host + svc prefix the document player builds its editor URL from (`bootstrap` is a bare global). */
function preloadUrl(editor, template, lang) {
  const { user_domain, svc } = (typeof bootstrap === "function" && bootstrap()) || {};
  if (!svc) return null;
  const host = user_domain || location.host;
  const theme = document.documentElement.dataset.theme || "light";
  const q = `name=${encodeURIComponent(template)}&hub_id=${encodeURIComponent(Visitor.get(_a.id))}&lang=${lang}&theme=${theme}`;
  return `https://${host}${svc}${editor}.preload?${q}`;
}

/**
 * Load one page in a hidden iframe, then remove it. Resolves `true` when the
 * slot ran its course, `false` when it was cut short because a real editor
 * opened (the caller then stops the whole run).
 */
function warmOne(url, editor) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText =
      "position:fixed;width:2px;height:2px;left:-10px;top:-10px;opacity:0;pointer-events:none;border:0";
    let settled = false;
    let timer = null;
    let watcher = null;
    const finish = (completed) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(watcher);
      window.removeEventListener("pagehide", onPagehide);
      try { frame.remove(); } catch (e) { /* already gone */ }
      resolve(completed);
    };
    const onPagehide = () => finish(false);
    // The page's load event fires before the editor inside it has fetched the
    // SDK and fonts: give it DWELL_AFTER_LOAD_MS more, under a hard cap.
    frame.addEventListener("load", () => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(true), DWELL_AFTER_LOAD_MS);
    });
    timer = setTimeout(() => finish(true), HARD_CAP_MS);
    // A real editor opening while we download would share the link with it and
    // slow the very thing this is meant to speed up: step aside at once.
    watcher = setInterval(() => { if (realEditorOpen(editor)) finish(false); }, WATCH_EVERY_MS);
    window.addEventListener("pagehide", onPagehide);
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
    const templates = ns.hasPreload ? (data.templates || {}) : {};
    const version = data.version || null;
    const mark = readMark();
    if (mark && mark.version === version && Date.now() - (mark.time || 0) < REDO_AFTER_MS) return;
    const lang = editorLang();
    for (const kind of KINDS) {
      let url = null;
      if (templates[kind]) {
        url = preloadUrl(ns.editor, templates[kind], lang);
      } else if (editors[kind]) {
        url = `${editors[kind]}?lang=${lang}&type=desktop&frameEditorId=drumee-warmup`;
      }
      if (!url) continue;
      // A real editor is on screen: stop, leave the mark unset so the next boot
      // finishes the job.
      if (realEditorOpen(ns.editor)) return;
      const completed = await warmOne(url, ns.editor);
      if (!completed) return;
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

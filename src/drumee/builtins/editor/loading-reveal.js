/** ================================================================== *
#   FILE : /src/drumee/builtins/editor/loading-reveal.js
#   TYPE : helper shared by editor_docs / editor_sheet
#   Lifts the window's loading skeleton (`.editor-loading`, see each
#   editor's skeleton) once the Casual editor under it has really painted.
# ===================================================================**/

// Casual draws its chrome icons with the Material Symbols font, loaded from
// Google Fonts (display=block). Until it arrives each icon is its ligature
// NAME in a fallback face ("table", "pivot_table", "history"…), spilling
// out of the window — so the skeleton waits for the font as well.
const ICON_FAMILY = /Material Symbols/;
// No icon face declared at all this long after the editor painted: this
// build draws no icons, do not wait for them.
const NO_FONT_GRACE = 4000;

function iconFont() {
  if (!document.fonts) return "loaded";
  let seen = false;
  for (const face of document.fonts) {
    if (!ICON_FAMILY.test(face.family)) continue;
    if (face.status === "loaded") return "loaded";
    seen = true;
  }
  return seen ? "pending" : "none";
}

function fade(loading) {
  if (!loading || loading.dataset.leaving) return;
  loading.dataset.leaving = "1";
  setTimeout(() => loading.remove(), 240);
}

/**
 * Poll until `painted()` and the icon font are both true, then fade the
 * skeleton out; mark the window `data-icons="ready"` once the font is in
 * (the skins hide icon spans until then). Never longer than `timeout`.
 *
 * @param {Element} win            the editor window element
 * @param {Object}  opt
 * @param {Function} opt.painted   true once the editor is on screen
 * @param {Number}  [opt.timeout]  ms before the skeleton goes regardless
 * @returns {Function} cancel
 */
function revealWhenPainted(win, opt = {}) {
  const timeout = opt.timeout || 20000;
  const started = Date.now();
  let paintedAt = 0;
  let timer = null;
  const loading = () => win && win.querySelector(".editor-loading");

  const tick = () => {
    if (!win || !win.isConnected) return;
    const font = iconFont();
    if (font === "loaded") win.dataset.icons = "ready";
    const skel = loading();
    if (skel) {
      let painted = false;
      try {
        painted = !!opt.painted();
      } catch (e) {
        /** editor torn down */
      }
      if (painted && !paintedAt) paintedAt = Date.now();
      const fontOk =
        font === "loaded" || (font === "none" && paintedAt && Date.now() - paintedAt > NO_FONT_GRACE);
      if ((painted && fontOk) || Date.now() - started > timeout) {
        // One more frame for the grid / page to paint under the cover.
        requestAnimationFrame(() => requestAnimationFrame(() => fade(skel)));
      }
    } else if (font === "loaded" || Date.now() - started > 60000) {
      return; // revealed, and the icons are in (or never will be)
    }
    timer = setTimeout(tick, skel ? 120 : 500);
  };
  tick();
  return () => clearTimeout(timer);
}

/**
 * Lift the skeleton now (an editor error must not stay hidden behind it).
 *
 * @param {Element} win
 */
function hideLoading(win) {
  fade(win && win.querySelector(".editor-loading"));
}

module.exports = { revealWhenPainted, hideLoading };

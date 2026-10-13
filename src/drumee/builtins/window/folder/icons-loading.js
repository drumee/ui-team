/**
 * Skeleton-loading stamp for the folder window's Files list.
 *
 * `data-loading="1"` on `.window__files-panel` from "first page requested"
 * until the list answers; skin/icons-skeleton.scss swaps the list for the
 * static skeleton (skeleton/toolkit/icons-skeleton.js) while it is set.
 *
 * Cleared on the list's FIRST data / eod / error. `data` fires before the
 * rows render, which is what we want: the real rows replace the skeleton in
 * the same frame. Call begin() AFTER list.restart(): restart fires a flush
 * `eod` synchronously, which would otherwise end the load it just started.
 *
 * Plain functions of the window (`win`) — tests/folder-icons-loading.test.js.
 */
const SAFETY_MS = 15000;

function panelOf(win, list) {
  const el = list && list.el;
  if (!el || typeof el.closest !== "function") return null;
  return el.closest(`.${win.fig.group}__files-panel`);
}

function end(win) {
  const s = win._iconsLoading;
  if (!s) return;
  win._iconsLoading = null;
  clearTimeout(s.timer);
  if (s.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(s.raf);
  for (const ev of s.events) s.list.off(ev, s.done);
  if (s.panel) delete s.panel.dataset.loading;
}

/**
 * Stamp the files panel, or keep looking for it until the list is attached.
 *
 * A FRESH PANE (every workspace switch: Wm.loadWorkspace re-feeds the layer)
 * reaches begin() from onPartReady, and ui-core registers a part in its
 * onBeforeRender (letc/addons/letc.js) — before the list has rendered, let
 * alone been appended under its files panel. closest() finds nothing there,
 * and begin() used to give up: no stamp, so the list showed blank while its
 * first page was in flight and the skeleton never appeared. In-place
 * navigation (loadContent) never hit this, the list being attached by then.
 *
 * The panel is assembled synchronously with the window, so it is there by the
 * next animation frame — which runs before that frame's paint, so the
 * skeleton is up for the first frame the pane is drawn. Bounded by SAFETY_MS
 * through end(), and an answer that lands first ends it without ever stamping.
 */
function stamp(win, s) {
  s.raf = 0;
  if (win._iconsLoading !== s) return;
  const panel = panelOf(win, s.list);
  if (panel) {
    s.panel = panel;
    panel.dataset.loading = "1";
    return;
  }
  if (typeof requestAnimationFrame === "function") {
    s.raf = requestAnimationFrame(() => stamp(win, s));
  }
}

function begin(win, list) {
  end(win);
  if (!list) return;
  const done = () => end(win);
  const events = [_e.data, _e.eod, _e.error];
  for (const ev of events) list.once(ev, done);
  const s = {
    list,
    panel: null,
    raf: 0,
    done,
    events,
    // Never leave the skeleton up: a request that never answers (or a list
    // destroyed mid-load) would otherwise strand it forever.
    timer: setTimeout(done, SAFETY_MS),
  };
  win._iconsLoading = s;
  stamp(win, s);
}

function isLoading(win) {
  return !!win._iconsLoading;
}

module.exports = { begin, end, isLoading, panelOf, SAFETY_MS };

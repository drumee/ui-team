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
  for (const ev of s.events) s.list.off(ev, s.done);
  delete s.panel.dataset.loading;
}

function begin(win, list) {
  end(win);
  const panel = panelOf(win, list);
  if (!panel) return;
  panel.dataset.loading = "1";
  const done = () => end(win);
  const events = [_e.data, _e.eod, _e.error];
  for (const ev of events) list.once(ev, done);
  win._iconsLoading = {
    list,
    panel,
    done,
    events,
    // Never leave the skeleton up: a request that never answers (or a list
    // destroyed mid-load) would otherwise strand it forever.
    timer: setTimeout(done, SAFETY_MS),
  };
}

function isLoading(win) {
  return !!win._iconsLoading;
}

module.exports = { begin, end, isLoading, panelOf, SAFETY_MS };

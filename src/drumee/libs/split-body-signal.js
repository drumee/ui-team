/**
 * "The workspace's split body is on screen" — the moment a reload may put the
 * last screen back over it (modules/desk _restoreScreen).
 *
 * window_folder raises EVENT the first time a HEADLESS pane's split body has
 * had a frame on screen, and sets `_splitBodyShown` on itself at the same
 * moment (window/folder _announceSplitBodyShown). This waits for either.
 *
 * FLAG FIRST, EVENT SECOND. The restore can start after the pane already
 * painted — a warm reload paints fast — and a broadcast that already fired is
 * gone. The flag cannot be missed.
 *
 * NEVER HANGS. A pane that never paints (no workspace, a failed load)
 * resolves false at the timeout, and the caller decides what to do.
 *
 * Pure: the pane lookup and the bus are injected, so
 * tests/split-body-signal.test.js can drive it.
 */
const EVENT = "workspace:split-body-shown";

const shown = (pane) =>
  !!(pane && !(pane.isDestroyed && pane.isDestroyed()) && pane._splitBodyShown);

/**
 * @param {Object} o
 * @param {Function} o.getPane  () => the headless pane, or null
 * @param {Object} o.bus        { on(event, fn), off(event, fn) }
 * @param {Number} [o.timeout=8000]
 * @param {Function} [o.schedule=setTimeout]
 * @param {Function} [o.cancel=clearTimeout]
 * @returns {Promise<Boolean>} true once shown, false on timeout
 */
function whenSplitBodyShown({
  getPane,
  bus,
  timeout = 8000,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  return new Promise((resolve) => {
    let pane = null;
    try {
      pane = getPane();
    } catch (e) {
      pane = null;
    }
    if (shown(pane)) return resolve(true);

    let done = false;
    let timer = null;
    const finish = (value) => {
      if (done) return;
      done = true;
      bus.off(EVENT, onShown);
      if (timer) cancel(timer);
      resolve(value);
    };
    // window_folder only raises this for a headless pane, so any arrival is
    // the one being waited for.
    const onShown = () => finish(true);
    bus.on(EVENT, onShown);
    timer = schedule(() => finish(false), timeout);
  });
}

module.exports = { EVENT, whenSplitBodyShown };

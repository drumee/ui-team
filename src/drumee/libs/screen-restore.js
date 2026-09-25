/**
 * Put the last screen back after a reload — the ORDER and the GUARDS, with
 * everything that touches the app injected through `host` (see
 * modules/desk _restoreScreen for the real one).
 *
 *   1. wait until the workspace's split body is on screen
 *   2. stop if the user already went somewhere
 *   3. open the screen
 *   4. find the REAL widget (lazy kinds paint a placeholder first)
 *   5. wait until its first load has painted (libs/items-ready)
 *   6. if it never did, refresh it ONCE
 *   7. light its sidebar row
 *
 * WHY THE SPLIT BODY FIRST. The screen used to be replayed 300ms after the
 * pane MOUNTED, which is not when it paints: the screen could land before the
 * workspace under it, and the pane then drew over or beside it.
 *
 * THE USER WINS. Two signals, because neither covers every gesture:
 * `navSeq` moves on rail/switcher gestures and on full-canvas screens, but not
 * on the slide-outs (Trash, Contacts); `currentScreen` sees those. Before the
 * open, ANY screen up means the user opened it — and also means a toggle
 * service would close it. After the open, only a DIFFERENT screen counts:
 * ours reports itself late (slide-outs flip data-anim a frame or a load
 * later), and waiting for it to report would cancel good restores.
 *
 * NEVER THROWS, NEVER HANGS: every wait has a timeout and every host call
 * that can fail is contained (including a sync throw from entry.ready),
 * because this runs inside boot.
 *
 * Pure: tests/screen-restore.test.js drives it with a fake host.
 */
const TIMEOUTS = { splitBody: 8000, widget: 5000, items: 6000 };
const TIMED_OUT = Symbol("timed-out");
const FAILED = Symbol("failed");

/**
 * @param {*} promiseOrValue
 * @param {Number} ms
 * @returns {Promise<*>} the value, TIMED_OUT, or FAILED on rejection
 */
function withTimeout(promiseOrValue, ms) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(TIMED_OUT);
    }, ms);
    Promise.resolve(promiseOrValue).then(
      (value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(FAILED);
      },
    );
  });
}

/**
 * Call `find` until it answers something truthy.
 * @param {Function} find
 * @param {Object} o
 * @param {Number} o.timeout
 * @param {Number} [o.interval=100]
 * @returns {Promise<*>} what find answered, or null at the timeout
 */
function pollFor(find, { timeout, interval = 100 }) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      let value = null;
      try {
        value = find();
      } catch (e) {
        value = null;
      }
      if (value) return resolve(value);
      if (Date.now() - start >= timeout) return resolve(null);
      setTimeout(tick, interval);
    };
    tick();
  });
}

/**
 * @param {Object} o
 * @param {String} o.service  the saved service, e.g. "toggle-trash"
 * @param {Object|null} o.entry  its registry row (desk _SCREEN_RESTORE)
 * @param {Object} o.host  see the module comment
 * @param {Object} [o.timeouts=TIMEOUTS]
 * @returns {Promise<String>} what happened — one of: "no-entry", "user-navigated", "open-failed", "no-widget", "ready", "refreshed", "not-ready", "error"
 */
async function restoreScreen({ service, entry, host, timeouts = TIMEOUTS }) {
  async function run() {
    if (!entry) return "no-entry";

    const seq0 = host.navSeq();
    const shown = await host.whenSplitBodyShown(timeouts.splitBody);
    if (!shown) {
      // Open anyway: leaving the user on a bare workspace, with the screen they
      // were on silently dropped, is the worse outcome.
      try {
        host.warn(`[restore] split body not shown after ${timeouts.splitBody}ms; opening ${service} anyway`);
      } catch (e) {
        // guard warn itself
      }
    }
    if (host.navSeq() !== seq0 || host.currentScreen()) return "user-navigated";

    try {
      await host.open(service);
    } catch (e) {
      try {
        host.warn(`[restore] could not open ${service}`, e);
      } catch (e2) {
        // guard warn itself
      }
      return "open-failed";
    }
    // The open itself goes through togglePanel -> _navigated for a full-canvas
    // screen, so the baseline is taken AFTER it.
    const seq1 = host.navSeq();
    const moved = () => {
      if (host.navSeq() !== seq1) return true;
      const up = host.currentScreen();
      return !!up && up !== service;
    };

    const widget = await host.awaitWidget(entry, timeouts.widget);
    if (!widget) {
      try {
        host.warn(`[restore] ${entry.kind} did not mount within ${timeouts.widget}ms`);
      } catch (e) {
        // guard warn itself
      }
      return "no-widget";
    }
    if (moved()) return "user-navigated";

    let status = "ready";
    if (entry.ready) {
      const result = await withTimeout(Promise.resolve().then(() => entry.ready(widget)), timeouts.items);
      if (result === TIMED_OUT || result === FAILED) {
        if (moved()) return "user-navigated";
        if (entry.refresh) {
          status = "refreshed";
          try {
            entry.refresh(widget);
          } catch (e) {
            try {
              host.warn(`[restore] refreshing ${entry.kind} failed`, e);
            } catch (e2) {
              // guard warn itself
            }
          }
        } else {
          status = "not-ready";
          try {
            host.warn(`[restore] ${entry.kind} items not ready after ${timeouts.items}ms`);
          } catch (e) {
            // guard warn itself
          }
        }
      }
    }

    if (moved()) return "user-navigated";
    host.lightRow(service);
    return status;
  }

  try {
    return await run();
  } catch (e) {
    try {
      host.warn("[restore] failed", e);
    } catch (e2) {
      // guard warn itself
    }
    return "error";
  }
}

module.exports = { restoreScreen, pollFor, withTimeout, TIMED_OUT, FAILED, TIMEOUTS };

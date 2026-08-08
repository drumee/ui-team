/**
 * Reward-flow exit guard.
 *
 * Every way out of the flow that happens INSIDE the app already asks "Don't
 * drop now" — the vignette on a card step, __guide-scrim during a walkthrough,
 * the backdrop beside a Step 2 surface. Three ways out walked straight past all
 * of it: pressing F5, pressing Back, and closing the tab. The first two are the
 * common ones during a walkthrough that has taken over the screen.
 *
 * WHAT A BROWSER WILL AND WILL NOT ALLOW.
 *
 * A page cannot render its own UI on unload. `beforeunload` can only raise the
 * browser's NATIVE "Leave site?" dialog, whose wording is the browser's and not
 * ours. So this module catches what can be caught BEFORE the page starts
 * leaving, and raises the flow's own guard for those:
 *
 *   reload    F5 / Ctrl+R / Cmd+R (+Shift for a hard reload) — a keydown, so it
 *             is cancellable, unlike Ctrl+W or Cmd+Q which the browser keeps
 *             for itself.
 *   navigate  the Back button, trapped with a history sentinel (see _push) so
 *             the router never runs and the desk is never torn down.
 *
 * Both are things the user actually DID, which is the line this module holds.
 * Watching the cursor leave through the top of the viewport would catch more —
 * it is the classic exit-intent heuristic — but it guesses at an intention
 * rather than reading an action, and it fires just as readily on someone
 * reaching for a bookmark. A guard that interrupts a walkthrough on a guess is
 * worse than one that misses a gesture.
 *
 * `beforeunload` is kept only as the last-resort net for what nothing can
 * intercept — Cmd+W, the tab's close box, the address bar, and the browsers
 * that refuse to let Cmd+R be cancelled. It posts nothing and shows no card.
 *
 * WHAT IT DOES NOT DO.
 *
 * It does not report anything to the funnel. "Drop anyway" remains the only
 * outright abandon gesture and the only writer of `dropped`; a tab closed past
 * the native dialog still leaves the row at `started`, which is what lets the
 * flow resume from reward_claim.step on the next login instead of being closed
 * off for a user who only meant to come back later.
 *
 * Split out of index.js for the same reason as steps.js and storage.js: the
 * orchestrator extends the `LetcBox` global and cannot be required under bare
 * Node, so none of the decisions below could be exercised without a browser.
 * The two that are worth testing — which keystroke is a reload, and whether the
 * flow is in a state worth guarding — are pure functions, and everything that
 * touches `window` is guarded so the module loads anywhere.
 */

const { STEPS, baseStep } = require("./steps");

/**
 * Is this keystroke a request to reload the page?
 *
 * Shift is deliberately allowed through: Ctrl+Shift+R is a hard reload, which
 * is the same intent and loses the same walkthrough. Alt is not — Alt+R opens a
 * menu on some platforms and is nobody's refresh.
 *
 * @param {KeyboardEvent} e
 * @returns {"reload"|null}
 */
function classifyKey(e) {
  if (!e || e.altKey) return null;
  if (e.key === "F5" && !e.ctrlKey && !e.metaKey) return "reload";
  if (String(e.key || "").toLowerCase() === "r" && (e.ctrlKey || e.metaKey)) {
    return "reload";
  }
  return null;
}

/**
 * Is the flow in a state worth guarding?
 *
 * One predicate for all four signals, so there is a single place to reason
 * about when the guard speaks up.
 *
 * An ALLOWLIST of the three card steps, not a denylist of terminal ones. The
 * two differ only for a step name this module does not know about, and there
 * the answers are opposite: a denylist raises a "Leave site?" dialog on it, an
 * allowlist stays quiet. Quiet is the right failure — this predicate's whole
 * job is deciding when to interrupt someone, and a state nobody anticipated is
 * not evidence that interrupting them is warranted. It also means a fourth step
 * cannot be added to the flow and silently inherit the guard.
 *
 * `baseStep` strips both `_waiting` and `_guide`, so the handoffs stay guarded:
 * they are where users most often wander off, and excluding them would miss the
 * common abandon.
 *
 * `congrats` and `soldout` fall out of the allowlist for free, which matters
 * twice over. A "Leave site?" dialog between a user and their dashboard right
 * after they have won is the worst possible moment for one; and it is what
 * excludes a CAPPED run, which mounts straight into `soldout` — its vignette
 * deliberately carries no click service either, because offering to talk a user
 * out of leaving a flow they were never given would be nonsense.
 *
 * @param {String} step the orchestrator's current step
 * @param {{finishing?: Boolean, guardOpen?: Boolean}} [flags]
 * @returns {Boolean}
 */
function armed(step, { finishing = false, guardOpen = false } = {}) {
  if (!STEPS.includes(baseStep(step))) return false;
  // Already on its way out — there is nothing left to talk the user out of.
  if (finishing) return false;
  // The guard is already up. A second F5 while it is on screen is swallowed
  // rather than re-raising it, which would restart its entry animation and
  // replace the intent the user is currently being asked about.
  if (guardOpen) return false;
  return true;
}

/** Marks the history entry this module pushes, so a popstate can be told from
 *  any other the app makes. */
const SENTINEL = "reward-flow-exit-guard";

class ExitGuard {
  /** @param {Object} ui the reward_flow orchestrator. Must expose
   *  exitArmed() and onExitIntent(). */
  constructor(ui) {
    this._ui = ui;
    this._on = false;
    // Our history entry is still the current one, i.e. Back has not been
    // pressed since it was pushed.
    this._sentinel = false;
    // The flow is leaving deliberately (see resumeNavigate), so stop() must not
    // try to tidy the history out from under it.
    this._exiting = false;
    this._onKey = null;
    this._onPop = null;
    this._onUnload = null;
  }

  // ───────── lifecycle ─────────

  /** Begin guarding. No-op (safe) when there is no window. */
  start() {
    if (this._on || typeof window === "undefined") return;
    this._on = true;
    this._exiting = false;

    // CAPTURE phase, like the Step 2 backdrop guard: the keystroke has to be
    // cancelled before anything inside the desk acts on it.
    this._onKey = (e) => {
      if (classifyKey(e) !== "reload") return;
      if (!this._armed()) return;
      e.preventDefault();
      e.stopPropagation();
      this._raise({ kind: "reload" });
    };
    window.addEventListener("keydown", this._onKey, true);

    // Back / Forward. See _push for why this is a sentinel rather than a
    // hashchange listener.
    this._onPop = () => {
      if (!this._sentinel) return;   // not ours — the app navigated for itself
      // Landing back ON our own entry means this pop consumed something the
      // app pushed OVER it, not the sentinel. Leave the trap where it is.
      if (this._isCurrent()) return;
      this._sentinel = false;
      if (!this._armed()) return;
      this._raise({ kind: "navigate" });
    };
    window.addEventListener("popstate", this._onPop);

    // The net under everything above.
    this._onUnload = (e) => {
      if (!this._armed()) return;
      e.preventDefault();
      // Assigned as well as prevented: the older browsers key their dialog off
      // returnValue, and nothing else reads it.
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", this._onUnload);

    this._push();
  }

  /** Unbind everything and give the history entry back. */
  stop() {
    if (!this._on) return;
    this._on = false;
    if (typeof window !== "undefined") {
      if (this._onKey) window.removeEventListener("keydown", this._onKey, true);
      if (this._onPop) window.removeEventListener("popstate", this._onPop);
      if (this._onUnload) {
        window.removeEventListener("beforeunload", this._onUnload);
      }
    }
    this._onKey = null;
    this._onPop = null;
    this._onUnload = null;
    // Pop our own entry, so the flow does not cost the user an extra Back press
    // for the rest of the session. The listeners are already gone, so the
    // popstate this fires is nobody's, and the URL is unchanged, so the router
    // does not run.
    //
    // Two states must NOT be tidied. The flow leaving THROUGH the sentinel
    // (resumeNavigate owns the history from here), and — the one that bites —
    // the app having navigated ON TOP of it: this teardown is usually caused by
    // exactly that, the desk module being destroyed under a route change, and
    // a blind back() there would drag the user back to the page they just left.
    // _isCurrent is what tells the two apart.
    if (this._sentinel && !this._exiting && this._isCurrent()) {
      this._sentinel = false;
      this._history("back");
    }
  }

  /** @returns {Boolean} our sentinel is the entry the browser is on right now,
   *  rather than something the app has since pushed over it. */
  _isCurrent() {
    try {
      return !!(typeof history !== "undefined" && history.state
        && history.state[SENTINEL]);
    } catch (e) {
      return false;
    }
  }

  // ───────── history sentinel ─────────

  /**
   * Push a duplicate of the current entry, so the FIRST Back press pops
   * something of ours instead of leaving the desk.
   *
   * A hashchange listener cannot do this job: it fires after the router has
   * already navigated, by which point the desk module — and the flow with it —
   * is being torn down, so there is nothing left to raise a guard on and
   * nothing to restore it to. The sentinel is consumed BEFORE any of that: the
   * URL never changes, so the router never runs.
   *
   * Re-pushed by rearm() when the user chooses to stay, which is what puts the
   * trap back for the next Back press.
   */
  _push() {
    if (this._sentinel) return;
    if (this._history("pushState")) this._sentinel = true;
  }

  /** Put the trap back after a guard the user dismissed with "Continue". */
  rearm() {
    if (!this._on) return;
    this._push();
  }

  /**
   * Carry out the Back the user was asking for, now that the flow has finished
   * with it. The sentinel is already consumed, so one step back is the entry
   * they were actually trying to reach.
   */
  resumeNavigate() {
    this._exiting = true;
    this._history("back");
  }

  /**
   * Every history call in one guarded place. It is the one API here that can
   * throw for reasons of its own (a sandboxed frame, a browser that refuses a
   * same-URL push), and a guard that cannot manipulate history must still leave
   * the rest of the flow working — the keystroke and beforeunload nets do not
   * depend on it.
   *
   * @returns {Boolean} the call went through
   */
  _history(op) {
    if (typeof history === "undefined") return false;
    try {
      if (op === "back") {
        history.back();
        return true;
      }
      if (typeof history.pushState !== "function") return false;
      history.pushState({ [SENTINEL]: 1 }, "", location.href);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ───────── plumbing ─────────

  _armed() {
    return typeof this._ui?.exitArmed === "function" && this._ui.exitArmed();
  }

  _raise(intent) {
    if (typeof this._ui?.onExitIntent === "function") {
      this._ui.onExitIntent(intent);
    }
  }
}

module.exports = { ExitGuard, classifyKey, armed, SENTINEL };

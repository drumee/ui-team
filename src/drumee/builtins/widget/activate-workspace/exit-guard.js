/**
 * Activation exit guard — hold the user in the flow until it is finished.
 *
 * The flow is now force-completed: there is no "Leave setup?" card and no way
 * out that the flow itself offers. This closes the ways out that the flow does
 * not own.
 *
 * WHY THIS IS NOT reward-flow's exit-guard, which does a superficially similar
 * job. That one INTERRUPTS to ask: every signal it catches ends in
 * `onExitIntent`, which raises the flow's own card, and "Drop anyway" then
 * carries out the exit the user asked for. Its whole shape is built around
 * offering the choice. Here there is no choice to offer, so the signals are
 * simply swallowed, and half of that file — the intent plumbing, the sentinel
 * hand-back in `resumeNavigate`, the `armed()` allowlist that exists to decide
 * when interrupting is warranted — would be imported and then bypassed. A
 * smaller local guard says what it does.
 *
 * WHAT A BROWSER WILL AND WILL NOT ALLOW, which sets the ceiling here:
 *
 *   reload    F5 / Ctrl+R / Cmd+R (+Shift) arrive as a keydown, so they are
 *             cancellable. The browser's own reload BUTTON and its menu item are
 *             not — nothing in a page can see them.
 *   navigate  the Back button, trapped with a history sentinel: our own entry is
 *             pushed straight back when it is popped, so the router never runs.
 *             Forward/Back become inert rather than blocked, which is the most a
 *             page can do.
 *   unload    Cmd+W, the tab's close box, the address bar, a killed process. Only
 *             `beforeunload` reaches these, and all it can do is raise the
 *             browser's NATIVE dialog, whose wording is the browser's. It is a
 *             deterrent, not a block, and modern browsers ignore it entirely
 *             unless the user has interacted with the page.
 *
 * So: a determined user gets out, and a crash always gets out. Guaranteeing the
 * flow is eventually finished is a different problem and needs persisted state
 * plus a re-trigger on the next load — see the design doc's Tier 2 note.
 *
 * Reports nothing. There is no funnel behind this flow, so nothing is written on
 * the way out, the same as before this guard existed.
 *
 * Everything that touches `window` is guarded so the module loads under bare
 * Node, and the one decision worth testing — which keystroke is a reload — is a
 * pure function.
 */

/**
 * Is this keystroke a request to reload the page?
 *
 * Shift is deliberately allowed through: Ctrl+Shift+R is a hard reload, which is
 * the same intent and loses the same walkthrough. Alt is not — Alt+R opens a
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

/** Marks the history entry this module pushes, so a popstate can be told from
 *  any other the app makes. */
const SENTINEL = "activate-workspace-exit-guard";

class ExitGuard {
  /** @param {Object} ui the orchestrator. Only `isDestroyed()` is consulted, and
   *  only defensively — this guard asks the flow nothing, because there is no
   *  state in which it stands down. */
  constructor(ui) {
    this._ui = ui;
    this._on = false;
    this._sentinel = false;
    this._onKey = null;
    this._onPop = null;
    this._onUnload = null;
  }

  /** Begin guarding. No-op (safe) when there is no window. */
  start() {
    if (this._on || typeof window === "undefined") return;
    this._on = true;

    // CAPTURE phase: the keystroke has to be cancelled before anything inside
    // the desk acts on it.
    this._onKey = (e) => {
      if (classifyKey(e) !== "reload") return;
      e.preventDefault();
      e.stopPropagation();
      // Nothing else. No card, no prompt — the flow simply stays where it is.
      // The orchestrator is told so it can acknowledge the press rather than
      // leaving the user wondering whether the key is broken.
      this._nudge();
    };
    window.addEventListener("keydown", this._onKey, true);

    // Back / Forward. Our entry is pushed straight back, so the URL never
    // changes and the router never runs. A hashchange listener could not do
    // this job: it fires AFTER the router has navigated, by which point the desk
    // module — and this flow with it — is being torn down.
    this._onPop = () => {
      if (!this._sentinel) return;      // not ours; the app navigated for itself
      if (this._isCurrent()) return;    // landed back on our own entry
      // Put it straight back. `_sentinel` stays true throughout: the trap is
      // never consumed, because there is no state in which we let it through.
      this._push(true);
      this._nudge();
    };
    window.addEventListener("popstate", this._onPop);

    // The only reach we have on a tab close or the browser's own reload control.
    // Unconditional, unlike reward-flow's, which arms itself only on the steps
    // worth interrupting: every step of this flow is worth interrupting, because
    // none of them can be resumed.
    this._onUnload = (e) => {
      if (this._ui?.isDestroyed?.()) return;
      e.preventDefault();
      // Assigned as well as prevented: older browsers key their dialog off
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
    // Give our entry back, so finishing the flow does not cost the user an extra
    // Back press for the rest of the session. The listeners are already gone, so
    // the popstate this fires is nobody's, and the URL is unchanged, so the
    // router does not run.
    //
    // Only when our entry is the one the browser is ON. This teardown is usually
    // caused by the desk module being destroyed under a route change — the app
    // having navigated ON TOP of the sentinel — and a blind back() there would
    // drag the user back to the page they just left.
    if (this._sentinel && this._isCurrent()) {
      this._sentinel = false;
      this._history("back");
    }
  }

  /** @returns {Boolean} our sentinel is the entry the browser is on right now,
   *  rather than something the app has since pushed over it. */
  _isCurrent() {
    try {
      return !!(typeof history !== "undefined" && history.state?.[SENTINEL]);
    } catch (e) {
      // Reading history.state throws for the same reasons writing it does — a
      // sandboxed frame most of all. "Not our entry" is the safe answer: the
      // popstate handler then treats the pop as somebody else's and stands down,
      // and stop() declines to hand an entry back it cannot prove is ours.
      return false;
    }
  }

  /**
   * Push a duplicate of the current entry, so a Back press pops something of
   * ours instead of leaving the desk.
   *
   * @param {Boolean} [force] push even though we believe one is already in
   *   place — used from popstate, where the entry we are replacing has just been
   *   consumed by the pop itself.
   */
  _push(force) {
    if (this._sentinel && !force) return;
    if (this._history("pushState")) this._sentinel = true;
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
      // WHAT CAN THROW HERE: pushState in a sandboxed frame without
      // allow-same-origin (a SecurityError), a browser refusing a same-URL push,
      // or a cross-origin location.href read. history.back() does not throw, but
      // it goes through the same guard so there is one place to reason about.
      //
      // Genuinely ignorable, and the failure is HANDLED rather than lost: `false`
      // propagates to _push, which then leaves `_sentinel` false, which makes the
      // popstate handler stand down entirely. The Back trap simply does not exist
      // in that environment — the keystroke and beforeunload nets are
      // independent of it and still work. The same false out of stop() means the
      // entry is not handed back, which costs the user one extra Back press at
      // worst.
      //
      // Reported through the orchestrator when it can take it, because this is
      // the file whose live behaviour is least certain from reading and a silent
      // no-Back-trap would be indistinguishable from a working one.
      this._ui?.warn?.("[activate] history guard unavailable", e);
      return false;
    }
  }

  /** Ask the flow to acknowledge a swallowed gesture. Optional by design: a
   *  guard that silently eats input reads as a broken page, but the
   *  acknowledgement is the orchestrator's to draw. */
  _nudge() {
    if (typeof this._ui?.nudge === "function") this._ui.nudge();
  }
}

module.exports = { ExitGuard, classifyKey, SENTINEL };

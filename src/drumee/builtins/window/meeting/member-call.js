// Roster "Call" button state for one meeting window.
//
// Calling a member used to set "calling" and wait for them to join: a callee
// who was offline, ignored the prompt or declined it left the row on "Call in
// progress" for the rest of the meeting, with no way to call them again. Every
// ring now ends:
//
//   idle ─Call─▶ calling ─┬─ joined ────────────────────▶ "Joined"
//                         ├─ declined  (conference.decline from the callee)
//                         ├─ no_answer (RING_MAX_MS without an answer)
//                         └─ offline   (the invite reached no session)
//                              └─ shown OUTCOME_HOLD_MS, then back to idle
//
// An outcome row stays callable, so "Call" again works straight away.
//
// The ring cap is the callee's own (incoming-ring.js): their prompt stops
// ringing when this row gives up, not 30s before or after.
const { RING_MAX_MS } = require("../../../modules/desk/wm/incoming-ring");

const OUTCOME_HOLD_MS = 5000;
const CALLING = "calling";
const JOINED = "joined";
const OUTCOMES = ["declined", "no_answer", "offline"];

/**
 * Did conference.invite actually ring someone? A ring answers { room_id, nid }.
 * An offline callee answers { offline } (or nothing at all), and a pending
 * cross call answers the pending row — neither rang a prompt that could ever
 * answer back.
 */
function inviteRang(result) {
  return !!(result && !result.offline && !result.cross_call && result.room_id);
}

class MemberCalls {
  /**
   * @param {Map} states   uid(string) → state; read by the roster skeleton
   * @param {Object} io    { refresh(key), setTimer?, clearTimer? }
   */
  constructor(states, io = {}) {
    this.states = states;
    this.refresh = io.refresh || (() => {});
    // Wrapped, never stored bare: this.setTimer(...) calls it with `this` set
    // to this object, and a browser's setTimeout/clearTimeout then throw
    // "Illegal invocation" — start() died before the invite was sent, so the
    // roster's Call button did nothing at all. (Node does not check `this`.)
    this.setTimer = io.setTimer || ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = io.clearTimer || ((t) => clearTimeout(t));
    this.timers = new Map();
  }

  canCall(key) {
    const s = this.states.get(String(key));
    return s !== CALLING && s !== JOINED;
  }

  /** Start ringing. False when the member is already ringing or in the call. */
  start(key) {
    key = String(key);
    if (!this.canCall(key)) return false;
    this._arm(key, CALLING, RING_MAX_MS, () => this.end(key, "no_answer"));
    return true;
  }

  /**
   * Close a ring with an outcome. Only a row that is still ringing moves: a
   * decline that lands after the ring timed out, or after the member joined
   * from another device, changes nothing.
   */
  end(key, outcome) {
    key = String(key);
    if (this.states.get(key) !== CALLING) return false;
    this._arm(key, outcome, OUTCOME_HOLD_MS, () => {
      this.timers.delete(key);
      if (this.states.get(key) !== outcome) return;
      this.states.delete(key);
      this.refresh(key);
    });
    return true;
  }

  /** The invite request itself failed: back to a plain "Call". */
  fail(key) {
    key = String(key);
    if (this.states.get(key) !== CALLING) return;
    this.clear(key);
    this.states.delete(key);
    this.refresh(key);
  }

  /** Drop the pending timer only; the caller owns the state change. */
  clear(key) {
    key = String(key);
    const t = this.timers.get(key);
    if (t) this.clearTimer(t);
    this.timers.delete(key);
  }

  dispose() {
    for (const t of this.timers.values()) this.clearTimer(t);
    this.timers.clear();
  }

  _arm(key, state, ms, fire) {
    this.clear(key);
    this.states.set(key, state);
    this.timers.set(key, this.setTimer(fire, ms));
    this.refresh(key);
  }
}

module.exports = {
  MemberCalls, inviteRang, OUTCOMES, OUTCOME_HOLD_MS, RING_MAX_MS,
};

// Ring while an incoming prompt (window_switchcall for a meeting) is open.
//
// Visitor owns ONE shared Audio: anything else that plays (a ring-back when the
// user places a call, a notification) replaces this ring. So the stop paths
// only mute when the ring is still what is playing — never someone else's
// sound.
//
// An ignored prompt must not ring forever: RING_MAX_MS caps it.
const RING_MAX_MS = 30000;

/**
 * @param {Object} view   the prompt; its `destroy` (accept, decline, close) ends the ring
 * @param {String} url    sound path (an _K.ringtones entry)
 * @param {Object} io     { play(url, loop), mute(), current() → url playing or null,
 *                          destroyEvent? (the caller's _e.destroy), setTimer?,
 *                          clearTimer? }
 */
function ringWhileOpen(view, url, io) {
  const setTimer = io.setTimer || setTimeout;
  const clearTimer = io.clearTimer || clearTimeout;
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    clearTimer(timer);
    const now = io.current();
    if (now && String(now).indexOf(url) !== -1) io.mute();
  };
  io.play(url, 1);
  const timer = setTimer(stop, RING_MAX_MS);
  if (view && typeof view.once === "function") view.once(io.destroyEvent || "destroy", stop);
  return stop;
}

/**
 * Does a desk-meeting-toast ring? Only the "now" card — a meeting started on
 * the spot, or a reminder that it is starting. An invitation or an "in N
 * minutes" heads-up announces nothing happening yet. Never over a live call.
 */
function toastRings(variant, inCall) {
  return variant === "now" && !inCall;
}

module.exports = { ringWhileOpen, toastRings, RING_MAX_MS };

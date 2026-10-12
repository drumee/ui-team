// Open / close the chat-header search results card with its animations.
// The folder skin plays a show keyframe on data-open="1" and a hide one on
// data-open="closing"; "0" is display:none. Closing waits for the hide
// animation to end, so the card fades out instead of vanishing (and the File
// threads bar it replaces stays hidden until then).
//
// No requires and no timers: tests load this file in a plain <script> under
// `chromium --dump-dom`.

function open(el) {
  if (el) el.dataset.open = "1";
}

function close(el) {
  if (!el || el.dataset.open === "0" || el.dataset.open === "closing") return;
  el.dataset.open = "closing";
  const anim = getComputedStyle(el).animationName;
  // No hide animation (reduced motion, or no skin): nothing to wait for.
  if (!anim || anim === "none") {
    el.dataset.open = "0";
    return;
  }
  const done = (e) => {
    if (e.target !== el) return; // a child's own animation
    el.removeEventListener("animationend", done);
    el.removeEventListener("animationcancel", done);
    // Re-opened while closing: keep it open.
    if (el.dataset.open === "closing") el.dataset.open = "0";
  };
  el.addEventListener("animationend", done);
  // A cancelled animation (the panel's tab hidden mid-close) ends the close too.
  el.addEventListener("animationcancel", done);
}

module.exports = { open, close };

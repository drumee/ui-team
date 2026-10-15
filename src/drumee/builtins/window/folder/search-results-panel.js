// Open / close the chat-header search results card with its animations, and
// wait out the search field's slide-out (folder _closeChatSearch).
// The folder skin plays a show keyframe on data-open="1" and a hide one on
// data-open="closing"; "0" is display:none. Closing waits for the hide
// animation to end, so the card fades out instead of vanishing (and the File
// threads bar it replaces stays hidden until then).
//
// No requires: tests load this file in a plain <script> under
// `chromium --dump-dom`. Only holdSkeleton uses a timer (tested under node).

// Run `cb` once `el`'s current animation ends (or is cancelled, e.g. its tab
// hidden mid-way); at once when it has none (reduced motion, or no skin).
function afterAnimation(el, cb) {
  const anim = getComputedStyle(el).animationName;
  if (!anim || anim === "none") return cb();
  const done = (e) => {
    if (e.target !== el) return; // a child's own animation
    el.removeEventListener("animationend", done);
    el.removeEventListener("animationcancel", done);
    cb();
  };
  el.addEventListener("animationend", done);
  el.addEventListener("animationcancel", done);
}

function open(el) {
  if (el) el.dataset.open = "1";
}

function close(el) {
  if (!el || el.dataset.open === "0" || el.dataset.open === "closing") return;
  el.dataset.open = "closing";
  afterAnimation(el, () => {
    // Re-opened while closing: keep it open.
    if (el.dataset.open === "closing") el.dataset.open = "0";
  });
}

// The loading skeleton stays up at least this long before the results
// replace it, however fast channel.search answers.
const SKELETON_MIN_MS = 1000;

// Resolves once the skeleton shown at `shownAt` (Date.now()) has been on
// screen SKELETON_MIN_MS; at once when it already has.
function holdSkeleton(shownAt) {
  const left = shownAt + SKELETON_MIN_MS - Date.now();
  if (left <= 0) return Promise.resolve();
  return new Promise((done) => setTimeout(done, left));
}

module.exports = { open, close, afterAnimation, holdSkeleton, SKELETON_MIN_MS };

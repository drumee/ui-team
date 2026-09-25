/**
 * Publish the desk workspace box as CSS insets on a slide-out panel.
 *
 * At ≤ 1024px the right-hand slide-outs (address_book, panel_trash,
 * panel_activity) cover the workspace — the same box chat-p2p fills from
 * settings-main-slot — so the rail stays visible beside them and the top bar
 * above them. They cannot get
 * that box from layout: their __panel-inner anchor is `position:absolute;
 * width:0`, so anything sized against it (`inset:0`, `width:100%`) collapses
 * to nothing. They stay position:fixed instead and read these variables.
 *
 * Measured rather than hard-coded because `.desk-module__right-side` has no
 * fixed offset: the rail is 64px or 231px depending on pointer type and pin
 * state, and the phone has its own top bar and bottom rail. Fixed is
 * viewport-relative, which is exactly what getBoundingClientRect returns.
 *
 * Writes --desk-canvas-inset-{top,right,bottom,left} on `el`. Returns a
 * function that stops tracking (call it from the panel's destroy hook), or
 * null when there is nothing to track yet (no el, or no desk in the DOM), so
 * the caller can try again later.
 */
function trackDeskCanvas(el) {
  if (!el) return null;
  const desk = el.closest(".desk-module") || document;
  const host = desk.querySelector(".desk-module__right-side");
  if (!host) return null;
  const sync = () => {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = el.style;
    s.setProperty("--desk-canvas-inset-top", `${r.top}px`);
    s.setProperty("--desk-canvas-inset-left", `${r.left}px`);
    s.setProperty("--desk-canvas-inset-right", `${window.innerWidth - r.right}px`);
    s.setProperty("--desk-canvas-inset-bottom", `${window.innerHeight - r.bottom}px`);
  };
  sync();
  // Size changes cover the rail pin toggle and viewport resizes; the window
  // listener catches moves that keep the size (e.g. a top bar swap).
  let observer = null;
  if (typeof ResizeObserver === "function") {
    observer = new ResizeObserver(sync);
    observer.observe(host);
  }
  window.addEventListener("resize", sync);
  return () => {
    if (observer) observer.disconnect();
    observer = null;
    window.removeEventListener("resize", sync);
  };
}

module.exports = { trackDeskCanvas };

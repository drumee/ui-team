/**
 * Settings' transient toast (settings_main _showToast / _renderToast /
 * _placeToast) as a helper any widget can feed into its own slot: a card
 * with a check (success) or warning (error) glyph and a one-line message,
 * hung under the topbar's utility icons for 3.5s.
 *
 * The host owns the slot part and the `${pfx}__toast*` styles (copy
 * invite-popup/skin's toast block); this only draws into it, places it, and
 * clears it again. The timer lives on the host, so a second toast replaces
 * the first instead of being cut short by its timer.
 *
 * Consumers: widget/invite-popup (link Copy).
 */

const TOAST_MS = 3500;
const TOAST_GAP = 8;

/**
 * Right edge on the topbar's utility cluster, TOAST_GAP below it; without a
 * cluster (phone topbar) the slot keeps its CSS corner.
 *
 * Set, measured and corrected by the difference: `position: fixed` is only
 * viewport-relative when no ancestor is transformed or filtered, and hosts
 * live inside animated slots and cards — the invite popup's own card has a
 * backdrop-filter and an entrance transform — so the offsets cannot be
 * trusted to be viewport pixels. A scaled ancestor scales them too: rendered
 * size over layout size is that scale, so the correction is divided by it.
 *
 * @param {HTMLElement} slot
 */
function placeToast(slot) {
  if (!slot) return;
  slot.style.top = "";
  slot.style.right = "";
  const cluster = document.querySelector(".desk-module-topbar__utility-cluster");
  const c = cluster && cluster.getBoundingClientRect();
  if (!c || !c.width || !c.height) return;
  const want = { top: c.bottom + TOAST_GAP, right: c.right };
  const style = getComputedStyle(slot);
  const got = slot.getBoundingClientRect();
  const sx = slot.offsetWidth ? got.width / slot.offsetWidth : 1;
  const sy = slot.offsetHeight ? got.height / slot.offsetHeight : 1;
  const top = (parseFloat(style.top) || 0) + (want.top - got.top) / (sy || 1);
  const right = (parseFloat(style.right) || 0) + (got.right - want.right) / (sx || 1);
  slot.style.top = `${top}px`;
  slot.style.right = `${right}px`;
}

/**
 * @param {String} pfx      the host's fig.family
 * @param {String} message
 * @param {String} kind     "success" | "error"
 */
function toastSkeleton(pfx, message, kind) {
  const ico = kind === "error" ? "apps-warning" : "app-check";
  return Skeletons.Box.X({
    className: `${pfx}__toast ${pfx}__toast--${kind}`,
    kids: [
      Skeletons.Image.Svg({ ico, className: `${pfx}__toast-ico` }),
      Skeletons.Note({ className: `${pfx}__toast-text`, content: message }),
    ],
  });
}

/**
 * @param {LetcBox} host    the widget owning the slot (holds the timer)
 * @param {Object}  opt
 * @param {Object}  opt.part    the slot part (may be absent — parts mount late)
 * @param {String}  opt.message
 * @param {String}  [opt.kind]  "success" (default) | "error"
 */
function showToast(host, { part, message, kind = "success" }) {
  if (!host || !part || !part.el) return;
  if (host._toastTimer) clearTimeout(host._toastTimer);
  part.feed(toastSkeleton(host.fig.family, message, kind));
  placeToast(part.el);
  host._toastTimer = setTimeout(() => {
    host._toastTimer = null;
    if (host.isDestroyed && host.isDestroyed()) return;
    part.feed([]);
  }, TOAST_MS);
}

/** Drop a pending timer — call from the host's onBeforeDestroy. */
function clearToast(host) {
  if (host && host._toastTimer) {
    clearTimeout(host._toastTimer);
    host._toastTimer = null;
  }
}

module.exports = { showToast, clearToast, placeToast, toastSkeleton, TOAST_MS };

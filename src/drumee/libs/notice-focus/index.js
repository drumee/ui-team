// Bring what a notification points at into view, then flash it — the shared
// last step of a pop-up's or a feed row's Open (Duy 2026-10-30: "lead user to
// the chat and highlight that message", and the same for a task comment or
// description).
//
// Scrolls the element's OWN scroller, never scrollIntoView: when the target
// cannot be centred (the last messages of a chat) scrollIntoView scrolls the
// leftover into every clipped ancestor and shifts the whole desk — the reason
// window/folder/chat-search-highlight.js scrolls its scroller directly too.

require("./skin");

const FOCUS_ATTR = "data-notice-focus";
const FLASH_MS = 2500;
const WAIT_MS = 6000;
const POLL_MS = 200;

// The nearest ancestor that actually scrolls vertically.
function scrollerOf(el) {
  let p = el && el.parentElement;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
    p = p.parentElement;
  }
  return null;
}

function reduceMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Centre `el` in its scroller (as far as the content allows).
function scrollToCentre(el) {
  const scroller = scrollerOf(el);
  if (!scroller) return;
  const s = scroller.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const offset = r.top - s.top + scroller.scrollTop;
  const top = Math.max(0, offset - (scroller.clientHeight - r.height) / 2);
  scroller.scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
}

// Flash `el` for a moment. A second flash on the same element restarts it.
function flash(el) {
  if (!el || !el.setAttribute) return;
  if (el._noticeFocusTimer) clearTimeout(el._noticeFocusTimer);
  el.setAttribute(FOCUS_ATTR, "1");
  el._noticeFocusTimer = setTimeout(() => {
    el._noticeFocusTimer = null;
    if (el.removeAttribute) el.removeAttribute(FOCUS_ATTR);
  }, FLASH_MS);
}

/**
 * Wait for `find()` to return an element (the target usually renders a moment
 * after the landing: a chat page, a task's comments), then scroll it into view
 * and flash it. Resolves to the element, or null when it never appeared — an
 * older chat message not loaded, a deleted comment — in which case nothing
 * moves.
 *
 * @param {function} find   returns the element or null; polled
 * @param {object}   [opt]  { timeout }
 * @returns {Promise<Element|null>}
 */
function focusWhenReady(find, { timeout = WAIT_MS } = {}) {
  return new Promise((resolve) => {
    let waited = 0;
    const tick = () => {
      let el = null;
      try {
        el = find();
      } catch (e) {
        el = null;
      }
      if (el && el.isConnected !== false) {
        scrollToCentre(el);
        flash(el);
        return resolve(el);
      }
      if (waited >= timeout) return resolve(null);
      waited += POLL_MS;
      setTimeout(tick, POLL_MS);
    };
    tick();
  });
}

/**
 * A chat widget (widget_chat) → its loaded message `message_id`.
 */
function focusChatMessage(chat, message_id) {
  if (!chat || !message_id) return Promise.resolve(null);
  return focusWhenReady(() => {
    if (chat.isDestroyed && chat.isDestroyed()) return null;
    const list = chat.__list;
    if (!list || !_.isFunction(list.getItemsByAttr)) return null;
    const item = list.getItemsByAttr("message_id", `${message_id}`)[0];
    return (item && item.el) || null;
  });
}

module.exports = { focusWhenReady, focusChatMessage, flash, scrollToCentre, FOCUS_ATTR };

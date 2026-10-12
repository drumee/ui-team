// Chat-header search highlight: marks the query in the folder chat while the
// header search (window__chat-search-input) is open.
//
// What is marked (and only this):
//   - message text: .widget-chatItem__message-line .widget-chatItem__conversation-content,
//     minus the attachment card and the reply quote that chat-item buildContent
//     moves INSIDE the bubble;
//   - attachment filenames: .widget-chatItem__attachment-wrapper-list .media-grid__content .filename.
// Matching folds case and accents like the server's LIKE under
// utf8mb4_general_ci (channel_search_scoped), so every result the server
// returns has something to mark.
//
// No requires and no timers: the DOM tests load this file in a plain <script>
// under `chromium --dump-dom`, which snapshots at load.

const HIT = "chat-search-hit";
const ITEM = "widget-chatItem";
const MIN_QUERY = 2;

function fold(ch) {
  return ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Folded copy of `text` + map[foldedIndex] = original index of the character
// that produced it (one trailing entry = text.length).
function foldWithMap(text) {
  let out = "";
  const map = [];
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i));
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) map.push(i);
    out += f;
    i += ch.length;
  }
  map.push(text.length);
  return { out, map };
}

function foldRanges(text, query) {
  const q = foldWithMap(`${query || ""}`.trim()).out;
  if (q.length < MIN_QUERY || !text) return [];
  const { out, map } = foldWithMap(`${text}`);
  const ranges = [];
  let from = 0;
  for (;;) {
    const at = out.indexOf(q, from);
    if (at < 0) break;
    ranges.push([map[at], map[at + q.length]]);
    from = at + q.length;
  }
  return ranges;
}

function isMark(el) {
  return el.classList && el.classList.contains(HIT);
}

function textNodesUnder(root, skip) {
  const out = [];
  const walk = (node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) out.push(child);
      else if (child.nodeType === 1 && !isMark(child) && !skip(child)) walk(child);
    }
  };
  walk(root);
  return out;
}

function markText(root, query, skip = () => false) {
  let count = 0;
  for (const node of textNodesUnder(root, skip)) {
    const ranges = foldRanges(node.nodeValue, query);
    // Last range first: splitting at s keeps [0, s) in `node`, so the earlier
    // ranges' offsets stay valid.
    for (let i = ranges.length - 1; i >= 0; i--) {
      const [s, e] = ranges[i];
      const hit = node.splitText(s);
      hit.splitText(e - s);
      const mark = root.ownerDocument.createElement("mark");
      mark.className = HIT;
      hit.parentNode.replaceChild(mark, hit);
      mark.appendChild(hit);
      count++;
    }
  }
  return count;
}

function unmark(root) {
  for (const mark of Array.from(root.querySelectorAll(`mark.${HIT}`))) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}

// Inside the bubble, the card and the quote are not this message's text.
function skipInBubble(el) {
  return (
    el.classList.contains(`${ITEM}__attachment-wrapper`) ||
    el.classList.contains(`${ITEM}-reply__main`)
  );
}

const BUBBLE = `.${ITEM}__message-line .${ITEM}__conversation-content`;
const FILENAME = `.${ITEM}__attachment-wrapper-list .media-grid__content .filename`;

function highlightChat(root, query) {
  unmark(root);
  let count = 0;
  const bubbles = root.querySelectorAll(BUBBLE);
  for (const el of Array.from(bubbles)) count += markText(el, query, skipInBubble);
  const names = root.querySelectorAll(FILENAME);
  for (const el of Array.from(names)) count += markText(el, query);
  return count;
}

// The bubbles / filenames an added node belongs to or contains. A node outside
// every chat item (composer, hover menu, typing indicator) has none.
function targetsOf(node, out) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (!el || !el.isConnected) return;
  for (const sel of [BUBBLE, FILENAME]) {
    const up = el.closest(sel);
    if (up) out.add(up);
    if (node.nodeType === 1) {
      for (const d of Array.from(node.querySelectorAll(sel))) out.add(d);
    }
  }
}

// ── Live controller ────────────────────────────────────────────────────
// Rows (older pages, incoming messages) and attachment cards (fetched after
// their row mounts) render while the search is open; the observer re-marks the
// bubbles / filenames that gained nodes (paintRecords). Painting disconnects
// first, so our own <mark> edits never re-trigger it.
const OBSERVE = { childList: true, subtree: true };
const CURRENT = "data-search-current";

// Re-mark only what the mutations touched, so unrelated changes (typing a
// reply, hovering) neither cost a full repaint nor move the user's selection.
function paintRecords(state, records) {
  const targets = new Set();
  for (const r of records) {
    for (const n of Array.from(r.addedNodes)) targetsOf(n, targets);
  }
  if (!targets.size) return;
  // Unmarking a bubble also clears the card filenames moved inside it.
  for (const t of Array.from(targets)) {
    if (t.matches(BUBBLE)) {
      for (const f of Array.from(t.querySelectorAll(FILENAME))) targets.add(f);
    }
  }
  state.observer.disconnect();
  for (const t of targets) {
    unmark(t);
    markText(t, state.query, t.matches(BUBBLE) ? skipInBubble : undefined);
  }
  state.observer.takeRecords();
  state.observer.observe(state.root, OBSERVE);
}

function paint(state) {
  state.observer.disconnect();
  highlightChat(state.root, state.query);
  state.observer.takeRecords();
  state.observer.observe(state.root, OBSERVE);
}

function clearCurrent(win) {
  const cur = win._chatSearchCurrentEl;
  win._chatSearchCurrentEl = null;
  if (cur && cur.removeAttribute) cur.removeAttribute(CURRENT);
}

function stop(win) {
  win._chatHighlightQuery = "";
  clearCurrent(win);
  const state = win._chatHighlight;
  if (!state) return;
  win._chatHighlight = null;
  state.observer.disconnect();
  unmark(state.root);
}

function start(win, query) {
  const q = `${query || ""}`.trim();
  if (foldWithMap(q).out.length < MIN_QUERY) {
    stop(win);
    return Promise.resolve();
  }
  win._chatHighlightQuery = q;
  return Promise.resolve(win.ensurePart("folder-chat")).then((chat) => {
    // Stopped, or a newer query took over, while the part resolved.
    if (win._chatHighlightQuery !== q) return;
    const root = chat && chat.el;
    if (!root) return;
    let state = win._chatHighlight;
    if (state && state.root !== root) {
      state.observer.disconnect();
      unmark(state.root);
      state = null;
    }
    if (!state) {
      state = { root, query: q, observer: null };
      state.observer = new MutationObserver((records) =>
        paintRecords(state, records),
      );
      win._chatHighlight = state;
    }
    // The jumped-to message belonged to the previous query.
    if (state.query !== q) clearCurrent(win);
    state.query = q;
    paint(state);
  });
}

// The message a result row jumped to gets the stronger highlight (skin).
function markCurrent(win, el) {
  const prev = win._chatSearchCurrentEl;
  if (prev && prev !== el && prev.removeAttribute) prev.removeAttribute(CURRENT);
  win._chatSearchCurrentEl = el || null;
  if (el && el.setAttribute) el.setAttribute(CURRENT, "1");
}

// Centre a jumped-to message in the chat's OWN scroller. Not scrollIntoView:
// when the message cannot be centred (the last ones), it scrolls the leftover
// into every clipped ancestor and shifts the whole desk up.
function scrollToHit(scroller, el) {
  if (!scroller || !el) return;
  const s = scroller.getBoundingClientRect();
  const h = el.getBoundingClientRect();
  const offset = h.top - s.top + scroller.scrollTop;
  scroller.scrollTop = Math.max(
    0,
    offset - (scroller.clientHeight - h.height) / 2,
  );
}

module.exports = {
  scrollToHit,
  HIT,
  foldRanges,
  markText,
  unmark,
  highlightChat,
  start,
  stop,
  markCurrent,
};

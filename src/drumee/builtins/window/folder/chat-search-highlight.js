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

function highlightChat(root, query) {
  unmark(root);
  let count = 0;
  const bubbles = root.querySelectorAll(
    `.${ITEM}__message-line .${ITEM}__conversation-content`,
  );
  for (const el of Array.from(bubbles)) count += markText(el, query, skipInBubble);
  const names = root.querySelectorAll(
    `.${ITEM}__attachment-wrapper-list .media-grid__content .filename`,
  );
  for (const el of Array.from(names)) count += markText(el, query);
  return count;
}

module.exports = { HIT, foldRanges, markText, unmark, highlightChat };

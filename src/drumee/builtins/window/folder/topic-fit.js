/**
 * Topic carousel fitting: the strip's page (skeleton/topic-strip) holds every
 * tab, and this measures which ones fit its width from a start tab — as many
 * as there is room for, not a fixed three — then hides the rest
 * (data-fit="0") and enables the arrows accordingly. The last page takes
 * tabs back from the one before so it stays full, and a kept tab (the picked
 * topic) is always on the page.
 *
 * Shared by the folder window's Files tab (./topics) and the Inbox's
 * Workspace chat (widget/chat-p2p/workspace-topics). Plain DOM; tested with
 * fake elements (tests/topic-fit.test.js). Without a DOM it answers null and
 * the callers keep the skeleton's provisional page.
 */
// The page's gap (skin/_topic-surfaces .window__topic-page).
const GAP = 4;

function pageOf(el) {
  return el && typeof el.querySelector === "function" ? el.querySelector('[class*="__topic-page"]') : null;
}

function widthOf(node) {
  if (node && typeof node.getBoundingClientRect === "function") return node.getBoundingClientRect().width;
  return (node && node.offsetWidth) || 0;
}

/** Every tab's natural width (all shown, none shrunk) and the room there is. */
function measure(el) {
  const page = pageOf(el);
  if (!page || !page.children) return null;
  const tabs = Array.from(page.children);
  page.dataset.measuring = "1";
  tabs.forEach((t) => (t.dataset.fit = "1"));
  const widths = tabs.map(widthOf);
  const avail = page.clientWidth || 0;
  delete page.dataset.measuring;
  return { page, tabs, widths, avail };
}

/** How many tabs fit from `start` (at least one). */
function forward(widths, avail, start) {
  let x = 0;
  let end = start;
  for (let i = start; i < widths.length; i++) {
    const w = widths[i] + (i > start ? GAP : 0);
    if (i > start && x + w > avail + 0.5) break;
    x += w;
    end = i + 1;
  }
  return Math.max(1, end - start);
}

/** The first tab of the fullest page that ends right before `end`. */
function backward(widths, avail, end) {
  let x = 0;
  let start = end;
  for (let i = end - 1; i >= 0; i--) {
    const w = widths[i] + (i < end - 1 ? GAP : 0);
    if (i < end - 1 && x + w > avail + 0.5) break;
    x += w;
    start = i;
  }
  return Math.min(start, Math.max(0, end - 1));
}

/**
 * Fit the page from `start`, keeping tab `keep` (optional) on it.
 * @returns {{start: number, count: number} | null}
 */
function fit(el, start, keep) {
  const m = measure(el);
  if (!m) return null;
  const n = m.tabs.length;
  if (!n) return { start: 0, count: 0 };
  let s = Math.min(Math.max(0, Number(start) || 0), n - 1);
  let count = forward(m.widths, m.avail, s);
  if (keep != null && keep >= 0 && keep < n && (keep < s || keep >= s + count)) {
    s = keep < s ? keep : backward(m.widths, m.avail, keep + 1);
    count = forward(m.widths, m.avail, s);
  }
  // The last page: take tabs back from the page before while they fit.
  if (s > 0 && s + count >= n) {
    s = backward(m.widths, m.avail, n);
    count = n - s;
  }
  m.tabs.forEach((t, i) => (t.dataset.fit = i >= s && i < s + count ? "1" : "0"));
  const arrows = typeof el.querySelectorAll === "function" ? Array.from(el.querySelectorAll('[class*="__topic-arrow"]')) : [];
  if (arrows[0]) arrows[0].dataset.disabled = s <= 0 ? "1" : "0";
  if (arrows[1]) arrows[1].dataset.disabled = s + count >= n ? "1" : "0";
  return { start: s, count };
}

/** Where the page before the one starting at `start` begins; null without a DOM. */
function prevStart(el, start) {
  if (!(start > 0)) return 0;
  const page = pageOf(el);
  const was = page && page.children ? Array.from(page.children).map((t) => t.dataset.fit) : [];
  const m = measure(el);
  if (!m || !m.tabs.length) return null;
  const s = backward(m.widths, m.avail, Math.min(start, m.tabs.length));
  // measure() showed every tab: put the current page back until the re-feed.
  m.tabs.forEach((t, i) => (t.dataset.fit = was[i] || "1"));
  return s;
}

/**
 * After a strip feed: fit once laid out, report {start, count} to `write`,
 * and re-fit when the strip is resized. `read` gives {start, keep} at that
 * time (keep is one-shot: the caller clears it).
 */
function attach(part, read, write) {
  const el = part && part.el;
  if (!el || !pageOf(el)) return;
  const run = () => {
    const { start, keep } = read() || {};
    const r = fit(el, start, keep);
    if (r) write(r);
  };
  el._topicFitRun = run;
  if (typeof ResizeObserver === "function" && !el._topicFitRO) {
    el._topicFitRO = new ResizeObserver(() => el._topicFitRun && el._topicFitRun());
    el._topicFitRO.observe(el);
  }
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else run();
}

module.exports = { fit, prevStart, attach, GAP };

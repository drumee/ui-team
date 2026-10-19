/**
 * Files-tab chat topic strip (Figma 775:130783): the tabs under the "Team
 * Chat" header — #General and one per topic — in one row that scrolls
 * sideways when it overflows, then "+ Create topic" pinned after it (always
 * in view). No All tab.
 *
 * Fed into the chat panel's "topic-strip" part by window/folder/topics.js
 * (paintStrip); the scope is shared with the Chat-tab rail (`topicId`:
 * "general" or a topic id; a legacy "all" reads as #General). After each
 * feed the caller runs `reveal(part)` to scroll the picked tab into view.
 *
 * `group` overrides the class family (the Inbox builds the window__ strip).
 *
 * @param {Object} ui folder window
 * @param {{ topics?: Array, topicId?: string, canCreateTopic?: any, group?: string }} opt
 * @returns {Array} kids of the strip
 */
function topicStrip(ui, opt = {}) {
  // `group`: the class family — the Inbox builds the folder's window__ strip.
  const grp = opt.group || ui.fig.group;
  const pfx = `${grp}__topic`;
  const topicId = opt.topicId && opt.topicId !== "all" ? `${opt.topicId}` : "general";
  const topics = Array.isArray(opt.topics) ? opt.topics : [];

  const tab = (attrs, kids, active) =>
    Skeletons.Box.X({
      className: `${pfx}-tab`,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      dataset: { active: active ? "1" : "0" },
      ...attrs,
      kids,
    });
  const label = (content) => Skeletons.Note({ className: `${pfx}-tab-name`, content });

  const tabs = [
    // Same service as the rail's # General row (topic_scope marks the pick).
    tab(
      { service: "thread-menu-general", topic_scope: "general", className: `${pfx}-tab ${pfx}-tab--general` },
      [label(`#${LOCALE.GENERAL || "General"}`)],
      topicId === "general",
    ),
    ...topics.map((e) =>
      tab(
        { service: "topic-menu-topic", topic_id: `${e.id || ""}`, topic_name: e.name || "" },
        [Skeletons.Note({ className: `${pfx}-tab-emoji`, content: e.emoji || "" }), label(e.name || "")],
        topicId === `${e.id}`,
      ),
    ),
  ];

  // The scroller: every tab, overflow scrolls sideways (skin).
  const kids = [Skeletons.Box.X({ className: `${pfx}-page`, kids: tabs })];
  if (opt.canCreateTopic) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}-tab ${pfx}-tab--create`,
        service: "topic-new",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ className: `${pfx}-create-ico`, ico: "ph-plus" }),
          Skeletons.Note({ className: `${pfx}-create-label`, content: LOCALE.CREATE_TOPIC || "Create topic" }),
        ],
      }),
    );
  }
  return kids;
}

const PAGE = '[class*="__topic-page"]';

/** Stamp which edges hide more tabs (data-fade: none|start|end|both; skin fades them). */
function edges(page) {
  if (!page || !page.dataset) return;
  const max = page.scrollWidth - page.clientWidth;
  const start = page.scrollLeft > 1;
  const end = max > 1 && page.scrollLeft < max - 1;
  page.dataset.fade = start && end ? "both" : start ? "start" : end ? "end" : "none";
}

/**
 * Desktop scrolling for the page, bound once on the strip's own element
 * (it outlives its feeds; every listener is delegated): a plain mouse wheel
 * scrolls it sideways (a trackpad / shift-wheel already does), a press-and-
 * drag pans it (the scrollbar is hidden), and the edge fades follow scroll
 * and resize.
 */
function bind(el) {
  if (el._topicScroll || typeof el.addEventListener !== "function") return;
  const pageOf = (e) => e.target && e.target.closest && e.target.closest(PAGE);
  const wheel = (e) => {
    const page = pageOf(e);
    if (!page || page.scrollWidth <= page.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    page.scrollLeft += e.deltaY;
    e.preventDefault();
  };

  let drag = null;
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    // A small tolerance so a plain click on a tab stays a click.
    if (!drag.moved && Math.abs(dx) < 4) return;
    drag.moved = true;
    drag.page.style.scrollBehavior = "auto";
    drag.page.scrollLeft = drag.left - dx;
    e.preventDefault();
  };
  const up = () => {
    if (!drag) return;
    document.removeEventListener("mousemove", move, true);
    document.removeEventListener("mouseup", up, true);
    drag.page.style.scrollBehavior = "";
    delete drag.page.dataset.panning;
    // A pan ends with a click on whatever tab is under the pointer: swallow it.
    if (drag.moved) {
      const swallow = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      el.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => el.removeEventListener("click", swallow, true), 0);
    }
    drag = null;
  };
  const down = (e) => {
    if (e.button !== 0) return;
    const page = pageOf(e);
    if (!page || page.scrollWidth <= page.clientWidth) return;
    drag = { page, x: e.clientX, left: page.scrollLeft, moved: false };
    page.dataset.panning = "1";
    document.addEventListener("mousemove", move, true);
    document.addEventListener("mouseup", up, true);
  };
  // scroll does not bubble: listen in the capture phase.
  const scroll = (e) => {
    if (e.target && e.target.matches && e.target.matches(PAGE)) edges(e.target);
  };

  el.addEventListener("wheel", wheel, { passive: false });
  el.addEventListener("mousedown", down);
  el.addEventListener("scroll", scroll, true);
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => edges(el.querySelector(PAGE))).observe(el);
  }
  el._topicScroll = true;
}

/**
 * After a feed: bind the page's scrolling, scroll the picked tab into view
 * and stamp the edge fades.
 *
 * @param {Object} part the "topic-strip" part
 */
function reveal(part) {
  const el = part && part.el;
  if (!el || typeof el.querySelector !== "function") return;
  bind(el);
  const run = () => {
    const page = el.querySelector(PAGE);
    const tab = page && page.querySelector('[data-active="1"]');
    if (tab) {
      const box = page.getBoundingClientRect();
      const r = tab.getBoundingClientRect();
      const left = r.left - box.left + page.scrollLeft;
      const right = left + r.width;
      if (left < page.scrollLeft) page.scrollLeft = left;
      else if (right > page.scrollLeft + page.clientWidth) page.scrollLeft = right - page.clientWidth;
    }
    edges(page);
  };
  // The fed kids render on the next frame.
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else run();
}

module.exports = topicStrip;
module.exports.reveal = reveal;

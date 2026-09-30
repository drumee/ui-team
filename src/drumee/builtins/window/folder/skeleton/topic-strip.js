/**
 * Files-tab chat topic strip (Figma 869:191968): the tabs under the "Team
 * Chat" header — #General and one per topic — as a carousel between a back
 * and a next button: every tab is on the page, `count` of them from `start`
 * shown (the rest data-fit="0"). ../topic-fit measures how many really fit
 * the width once laid out; PAGE_SIZE is the count until it has, then "Create topic" (styled like the
 * folder toolbar's "+ New" primary button) at the far end. No All tab.
 *
 * Fed into the chat panel's "topic-strip" part by window/folder/topics.js
 * (paintStrip), which keeps the page start; the scope is shared with the Chat-tab
 * rail (`topicId`: "general" or a topic id; a legacy "all" reads as
 * #General).
 *
 * @param {Object} ui folder window
 * `slide` ("next" | "prev") stamps the page so the skin slides it in from
 * that side (a page change only; topics.js decides).
 *
 * `group` overrides the class family (the Inbox builds the window__ strip).
 *
 * @param {{ topics?: Array, topicId?: string, canCreateTopic?: any, start?: number, count?: number, slide?: string, group?: string }} opt
 * @returns {Array} kids of the strip
 */
const PAGE_SIZE = 3;

// The strip's items in order: #General, then the topics.
function entries(topics) {
  return [{ general: true }, ...(Array.isArray(topics) ? topics : [])];
}

/** The strip index of `topicId` ("general" / a topic id); -1 when absent. */
function indexOf(topics, topicId) {
  const id = topicId && topicId !== "all" ? `${topicId}` : "general";
  return entries(topics).findIndex((e) => (e.general ? id === "general" : `${e.id}` === id));
}

/**
 * The page start that shows `topicId`: unchanged when it is on the page
 * [start, start + count); else it becomes the page's last tab (forward) or
 * first tab (back).
 */
function startFor(topics, topicId, start = 0, count = PAGE_SIZE) {
  const i = indexOf(topics, topicId);
  const s = Math.max(0, Number(start) || 0);
  const c = Math.max(1, Number(count) || PAGE_SIZE);
  if (i < 0 || (i >= s && i < s + c)) return s;
  return i < s ? i : Math.max(0, i - c + 1);
}

function topicStrip(ui, opt = {}) {
  // `group`: the class family — the Inbox builds the folder's window__ strip.
  const grp = opt.group || ui.fig.group;
  const pfx = `${grp}__topic`;
  const topicId = opt.topicId && opt.topicId !== "all" ? `${opt.topicId}` : "general";
  const all = entries(opt.topics);
  const count = Math.max(1, Number(opt.count) || PAGE_SIZE);
  let start = Math.max(0, Number(opt.start) || 0);
  if (start >= all.length) start = Math.max(0, all.length - count);
  const onPage = (i) => i >= start && i < start + count;

  const tab = (attrs, kids, active, fit) =>
    Skeletons.Box.X({
      className: `${pfx}-tab`,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      dataset: { active: active ? "1" : "0", fit: fit ? "1" : "0" },
      ...attrs,
      kids,
    });
  const label = (content) => Skeletons.Note({ className: `${pfx}-tab-name`, content });

  const tabs = all.map((e, i) =>
    e.general
      ? // Same service as the rail's # General row (topic_scope marks the pick).
        tab(
          { service: "thread-menu-general", topic_scope: "general", className: `${pfx}-tab ${pfx}-tab--general` },
          [label(`#${LOCALE.GENERAL || "General"}`)],
          topicId === "general",
          onPage(i),
        )
      : tab(
          { service: "topic-menu-topic", topic_id: `${e.id || ""}`, topic_name: e.name || "" },
          [Skeletons.Note({ className: `${pfx}-tab-emoji`, content: e.emoji || "" }), label(e.name || "")],
          topicId === `${e.id}`,
          onPage(i),
        ),
  );

  const arrow = (service, ico, disabled) =>
    Skeletons.Button.Svg({
      className: `${pfx}-arrow`,
      ico,
      service,
      uiHandler: [ui],
      dataset: { disabled: disabled ? "1" : "0" },
    });

  const kids = [
    arrow("topic-strip-prev", "caret-left", start <= 0),
    Skeletons.Box.X({
      className: `${pfx}-page`,
      dataset: { slide: opt.slide === "next" || opt.slide === "prev" ? opt.slide : "none" },
      kids: tabs,
    }),
    arrow("topic-strip-next", "caret-right", start + count >= all.length),
  ];
  if (opt.canCreateTopic) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}-tab ${pfx}-tab--create ${grp}-button__label-button primary`,
        service: "topic-new",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ className: `${pfx}-create-ico`, ico: "ph-plus" }),
          Skeletons.Note({ className: `${pfx}-create-label`, content: LOCALE.TOPIC || "Topic" }),
        ],
      }),
    );
  }
  return kids;
}

module.exports = topicStrip;
module.exports.indexOf = indexOf;
module.exports.startFor = startFor;
module.exports.PAGE_SIZE = PAGE_SIZE;

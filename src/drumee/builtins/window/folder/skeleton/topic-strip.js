/**
 * Files-tab chat topic strip (Figma 869:191968): the tabs under the "Team
 * Chat" header — #General and one per topic — as a carousel of PAGE_SIZE tabs
 * between a back and a next button, then "Create topic" (styled like the
 * folder toolbar's "+ New" primary button) at the far end. No All tab.
 *
 * Fed into the chat panel's "topic-strip" part by window/folder/topics.js
 * (paintStrip), which keeps the page; the scope is shared with the Chat-tab
 * rail (`topicId`: "general" or a topic id; a legacy "all" reads as
 * #General).
 *
 * @param {Object} ui folder window
 * `slide` ("next" | "prev") stamps the page so the skin slides it in from
 * that side (a page change only; topics.js decides).
 *
 * `group` overrides the class family (the Inbox builds the window__ strip).
 *
 * `pageSize` overrides PAGE_SIZE (the Inbox pages by 4).
 *
 * @param {{ topics?: Array, topicId?: string, canCreateTopic?: any, page?: number, pageSize?: number, slide?: string, group?: string }} opt
 * @returns {Array} kids of the strip
 */
const PAGE_SIZE = 3;

// The strip's items in order: #General, then the topics.
function entries(topics) {
  return [{ general: true }, ...(Array.isArray(topics) ? topics : [])];
}

/** The page (of `size` tabs) that shows `topicId` ("general" / a topic id); 0 when absent. */
function pageOf(topics, topicId, size = PAGE_SIZE) {
  const id = topicId && topicId !== "all" ? `${topicId}` : "general";
  const i = entries(topics).findIndex((e) => (e.general ? id === "general" : `${e.id}` === id));
  return i < 0 ? 0 : Math.floor(i / (Number(size) || PAGE_SIZE));
}

function topicStrip(ui, opt = {}) {
  // `group`: the class family — the Inbox builds the folder's window__ strip.
  const grp = opt.group || ui.fig.group;
  const pfx = `${grp}__topic`;
  const topicId = opt.topicId && opt.topicId !== "all" ? `${opt.topicId}` : "general";
  const all = entries(opt.topics);
  const size = Math.max(1, Number(opt.pageSize) || PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(all.length / size));
  const page = Math.min(Math.max(0, Number(opt.page) || 0), pages - 1);

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

  const tabs = all.slice(page * size, page * size + size).map((e) =>
    e.general
      ? // Same service as the rail's # General row (topic_scope marks the pick).
        tab(
          { service: "thread-menu-general", topic_scope: "general", className: `${pfx}-tab ${pfx}-tab--general` },
          [label(`#${LOCALE.GENERAL || "General"}`)],
          topicId === "general",
        )
      : tab(
          { service: "topic-menu-topic", topic_id: `${e.id || ""}`, topic_name: e.name || "" },
          [Skeletons.Note({ className: `${pfx}-tab-emoji`, content: e.emoji || "" }), label(e.name || "")],
          topicId === `${e.id}`,
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
    arrow("topic-strip-prev", "caret-left", page <= 0),
    Skeletons.Box.X({
      className: `${pfx}-page`,
      dataset: { slide: opt.slide === "next" || opt.slide === "prev" ? opt.slide : "none" },
      kids: tabs,
    }),
    arrow("topic-strip-next", "caret-right", page >= pages - 1),
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
module.exports.pageOf = pageOf;
module.exports.PAGE_SIZE = PAGE_SIZE;

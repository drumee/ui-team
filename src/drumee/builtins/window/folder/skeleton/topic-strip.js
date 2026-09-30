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
 * @param {{ topics?: Array, topicId?: string, canCreateTopic?: any, page?: number }} opt
 * @returns {Array} kids of the strip
 */
const PAGE_SIZE = 3;

// The strip's items in order: #General, then the topics.
function entries(topics) {
  return [{ general: true }, ...(Array.isArray(topics) ? topics : [])];
}

/** The page that shows `topicId` ("general" / a topic id); 0 when absent. */
function pageOf(topics, topicId) {
  const id = topicId && topicId !== "all" ? `${topicId}` : "general";
  const i = entries(topics).findIndex((e) => (e.general ? id === "general" : `${e.id}` === id));
  return i < 0 ? 0 : Math.floor(i / PAGE_SIZE);
}

function topicStrip(ui, opt = {}) {
  const grp = ui.fig.group;
  const pfx = `${grp}__topic`;
  const topicId = opt.topicId && opt.topicId !== "all" ? `${opt.topicId}` : "general";
  const all = entries(opt.topics);
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
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

  const tabs = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((e) =>
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
    Skeletons.Box.X({ className: `${pfx}-page`, kids: tabs }),
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

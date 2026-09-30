/**
 * Files-tab chat topic strip (Figma 869:191968): the tabs under the "Team
 * Chat" header — #General · one per topic · + Create topic (no All tab).
 * Fed into the chat panel's "topic-strip" part by window/folder/topics.js
 * (paintStrip); shares its scope with the Chat-tab rail (`topicId`:
 * "general" or a topic id; a legacy "all" reads as #General).
 *
 * @param {Object} ui folder window
 * @param {{ topics?: Array, topicId?: string, canCreateTopic?: any }} opt
 * @returns {Array} kids of the strip
 */
module.exports = function topicStrip(ui, opt = {}) {
  const pfx = `${ui.fig.group}__topic`;
  const topics = Array.isArray(opt.topics) ? opt.topics : [];
  const topicId = opt.topicId && opt.topicId !== "all" ? `${opt.topicId}` : "general";

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

  const kids = [
    // Same service as the rail's # General row (topic_scope marks the pick).
    tab(
      { service: "thread-menu-general", topic_scope: "general" },
      [label(`#${LOCALE.GENERAL || "General"}`)],
      topicId === "general",
    ),
    ...topics.map((t) =>
      tab(
        { service: "topic-menu-topic", topic_id: `${t.id || ""}`, topic_name: t.name || "" },
        [
          Skeletons.Note({ className: `${pfx}-tab-emoji`, content: t.emoji || "" }),
          label(t.name || ""),
        ],
        topicId === `${t.id}`,
      ),
    ),
  ];
  if (opt.canCreateTopic) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}-tab ${pfx}-tab--create`,
        service: "topic-new",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [label(`+ ${LOCALE.CREATE_TOPIC || "Create topic"}`)],
      }),
    );
  }
  return kids;
};

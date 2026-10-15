/**
 * New Topic dialog (Figma 867:186725): title + ✕, the chosen emoji beside the
 * name field, "Choose the topic icon" with 9 tabs (search, then the 8
 * libs/topic-emojis categories) over the emoji grid, Cancel / Create.
 *
 * Parts the widget updates in place (typing must keep the field's focus):
 * topic-preview, topic-error, topic-tabs, topic-search-row, topic-grid,
 * topic-create-btn.
 */
const { TOPIC_EMOJI_GROUPS, TOPIC_SEARCH_ICO, searchTopicEmojis } = require("../../../libs/topic-emojis");

const TABS = [{ key: "search", ico: TOPIC_SEARCH_ICO }, ...TOPIC_EMOJI_GROUPS.map((g) => ({ key: g.key, ico: g.ico }))];

function emojisOf(ui) {
  if (ui._tab === "search") return searchTopicEmojis(ui._query);
  const g = TOPIC_EMOJI_GROUPS.find((x) => x.key === ui._tab) || TOPIC_EMOJI_GROUPS[0];
  return g.emojis.map((x) => x[0]);
}

function tabs(ui) {
  const pfx = ui.fig.family;
  return TABS.map((t) =>
    Skeletons.Box.X({
      className: `${pfx}__tab`,
      service: "topic-tab",
      tab: t.key,
      dataset: { active: ui._tab === t.key ? "1" : "0" },
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [Skeletons.Image.Svg({ className: `${pfx}__tab-ico`, ico: t.ico })],
    }),
  );
}

function grid(ui) {
  const pfx = ui.fig.family;
  return emojisOf(ui).map((e) =>
    Skeletons.Note({
      className: `${pfx}__emoji`,
      service: "topic-emoji",
      emoji: e,
      content: e,
      dataset: { selected: e === ui._emoji ? "1" : "0" },
      uiHandler: [ui],
    }),
  );
}

function searchRow(ui) {
  const pfx = ui.fig.family;
  if (ui._tab !== "search") return [];
  return [
    Skeletons.Entry({
      className: `${pfx}__search`,
      service: "topic-search",
      interactive: 1,
      placeholder: LOCALE.SEARCH,
      value: ui._query || "",
      uiHandler: [ui],
    }),
  ];
}

function nameOk(name) {
  const n = [...`${name || ""}`.trim()].length;
  return n >= 1 && n <= 60;
}

function topicCreateSkeleton(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.NEW_TOPIC }),
          Skeletons.Button.Svg({ className: `${pfx}__close`, ico: "cross", service: "topic-close", uiHandler: [ui] }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__name-block`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__name-row`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__preview`,
                content: ui._emoji,
                sys_pn: "topic-preview",
                partHandler: ui,
              }),
              Skeletons.Entry({
                className: `${pfx}__name`,
                service: "topic-name",
                interactive: 1,
                placeholder: LOCALE.TOPIC_NAME_PLACEHOLDER,
                value: ui._name || "",
                uiHandler: [ui],
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__error`,
            content: ui._error || "",
            dataset: { state: ui._error ? "1" : "0" },
            sys_pn: "topic-error",
            partHandler: ui,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__icons`,
        kids: [
          Skeletons.Note({ className: `${pfx}__icons-label`, content: LOCALE.CHOOSE_TOPIC_ICON }),
          Skeletons.Box.X({ className: `${pfx}__tabs`, sys_pn: "topic-tabs", partHandler: ui, kids: tabs(ui) }),
          Skeletons.Box.X({
            className: `${pfx}__search-row`,
            sys_pn: "topic-search-row",
            partHandler: ui,
            dataset: { tab: ui._tab },
            kids: searchRow(ui),
          }),
          Skeletons.Box.X({ className: `${pfx}__grid`, sys_pn: "topic-grid", partHandler: ui, kids: grid(ui) }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__btn ${pfx}__btn--cancel`,
            service: "topic-cancel",
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [Skeletons.Note({ className: `${pfx}__btn-label`, content: LOCALE.CANCEL })],
          }),
          Skeletons.Box.X({
            className: `${pfx}__btn ${pfx}__btn--create`,
            service: "topic-create",
            sys_pn: "topic-create-btn",
            partHandler: ui,
            dataset: { disabled: nameOk(ui._name) ? "0" : "1", busy: ui._busy ? "1" : "0" },
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [Skeletons.Note({ className: `${pfx}__btn-label`, content: LOCALE.CREATE })],
          }),
        ],
      }),
    ],
  });
}

module.exports = topicCreateSkeleton;
module.exports.tabs = tabs;
module.exports.grid = grid;
module.exports.searchRow = searchRow;
module.exports.nameOk = nameOk;

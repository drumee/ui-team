// Notification tabs — Figma 43:29418.
//
// The cut changed axis. It used to be a RELATIONSHIP cut (All activity /
// Mentions / Shares — "how does this row involve me"); the design cuts by
// OBJECT TYPE (All / Files / Task / Meeting / Chat / Other — "what is this row
// about"). Every feed row already carries the discriminator: activity.get_feed
// returns `category` (media, chat, teamchat, meeting, hub_invite,
// access_request, share_open) or an `event` like "media.remove" / "task_*",
// which widget/item/getCategory() already normalises the same way.
//
// Each tab carries an unread count in the design. The badge element is built
// here and starts hidden (data-count="0"); nothing populates it yet because the
// feed has no per-category aggregate — see _setTab in ../index.js.
const TABS = [
  { key: 'all',     label: LOCALE.ALL,     service: 'tab-all',     pn: 'tab-all'     },
  { key: 'files',   label: LOCALE.FILES,   service: 'tab-files',   pn: 'tab-files'   },
  { key: 'task',    label: LOCALE.TASK,    service: 'tab-task',    pn: 'tab-task'    },
  { key: 'meeting', label: LOCALE.MEETING, service: 'tab-meeting', pn: 'tab-meeting' },
  { key: 'chat',    label: LOCALE.CHAT,    service: 'tab-chat',    pn: 'tab-chat'    },
  { key: 'other',   label: LOCALE.OTHER,   service: 'tab-other',   pn: 'tab-other'   },
];

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const active = ui._filter || 'all';

  return Skeletons.Box.X({
    className: `${pfx}__tabbar`,
    kids: TABS.map((tab) =>
      Skeletons.Box.X({
        className: `${pfx}__tab`,
        service: tab.service,
        sys_pn: tab.pn,
        state: tab.key === active ? 1 : 0,
        uiHandler: [ui],
        radio: `radio-${ui._id}`,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            className: `${pfx}__tab-label`,
            content: tab.label,
          }),
          Skeletons.Note({
            className: `${pfx}__tab-count`,
            sys_pn: `${tab.pn}-count`,
            partHandler: ui,
            content: '',
            // attrOpt, not dataset — a bare `dataset` is dropped at render, so
            // the badge would mount with no data-count for the skin to hide on.
            attrOpt: { 'data-count': 0 },
          }),
        ],
      })
    ),
  });
};

module.exports.TABS = TABS;

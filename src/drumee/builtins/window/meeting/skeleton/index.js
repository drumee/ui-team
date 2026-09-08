// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/window/channel/
//   TYPE : Skelton
// ==================================================================== *

/**
 * In-meeting side panel (Microsoft-Teams style). A single right-hand column
 * with a [ Participants | Chat ] tab switch at the top, so the attendee list
 * no longer shares space with the main screen — the screen gets full width and
 * you toggle between the participant roster and the team chat.
 *
 * - Participants tab: a members roster — every hub member, with status icons
 *   and a Call button for those not yet in the room. While a screen is shared
 *   the live tiles float over the presenter stage (see _dockParticipants), so
 *   the roster stays available here.
 * - Chat tab: widget_chat bound to the team's persisted hub channel (same
 *   conversation as the team window), so messages sent during the call live on
 *   in the team timeline.
 *
 * Tabs are toggled by flipping `data-tab` on the panel root (CSS show/hide) —
 * neither pane is re-mounted, so chat keeps its scroll/draft. The topbar People
 * and Chat buttons open this panel on the matching tab. Skipped on DMZ rooms.
 */
function meetingSidePanel(_ui_) {
  if (_ui_.mget(_a.area) === _a.dmz) return null;
  const pfx = _ui_.fig.family;

  // Bind the meeting chat to the SAME channel the launching folder/team window
  // uses (folder-scoped `share`), so messages + uploads sync into that chat.
  // chat_nid is the launching window's own chat-scope nid — NOT actual_home_id
  // (the workspace root), which would post to the outer team chat. Absent for
  // p2p/scheduled rooms, where we fall back to the room's own ids.
  const teamChatNid = _ui_.mget("chat_nid") || _ui_.mget(_a.actual_home_id);
  const isTeamChannel = !!teamChatNid;
  const chatArea = isTeamChannel ? _a.share : (_ui_.mget(_a.area) || _a.share);

  // On a phone the meeting stage is what matters — start with the side panel
  // CLOSED so the call (video + controls) is the default view, not chat. On
  // desktop it stays open (Figma). The topbar Chat/People buttons still open it.
  const startOpen = !Visitor.isMobile();

  // Chat INSIDE a meeting is the SAME right as workspace chat — this pane posts
  // through channel.post, which the server now gates on the download bit — so a
  // view-only member gets the roster without a composer instead of a conversation
  // every message of which would be refused.
  //
  // Scoped to the TEAM-channel case on purpose: a p2p / scheduled room falls back
  // to the room's own ids (isTeamChannel false) and is not a workspace
  // conversation, so it is left exactly as it is. DMZ already returned above.
  //
  // `permission` is the privilege conference_join resolved for this member
  // (webrtc/room/index.js msets it from c.user.permission). Absent/unreadable →
  // treated as allowed, so this can never blank the panel on a missing value.
  const meetingPriv = Number(_ui_.mget(_a.permission));
  const mayChat =
    !isTeamChannel
    || !Number.isFinite(meetingPriv)
    || (meetingPriv & _K.permission.download) === _K.permission.download;

  const tab = (id, label) =>
    Skeletons.Note({
      className: `${pfx}__chat-tab`,
      content: label,
      service: "switch-tab",
      tab: id,
      // Default active tab is Chat (see panel `data-tab` below), matching the
      // Figma "Chat | Participants" order.
      state: id === "chat" ? 1 : 0,
      // attrOpt is required for dataset to survive render (bare dataset is
      // dropped) — _applyPanelTab reads b.dataset.tab off the DOM to set the
      // active underline, so without it every switch zeroes both tabs.
      attrOpt: { "data-tab": id },
      dataset: { tab: id },
      uiHandler: [_ui_],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__chat-panel`,
    sys_pn: "meeting-chat",
    // Open by default on desktop, Chat tab active (Figma); closed on mobile so
    // the call stage is what shows first. attrOpt carries the initial data-* to
    // the DOM (bare dataset is dropped at render) — without it the panel mounts
    // with no data-open/data-tab, i.e. closed and tab-less.
    // Without the chat right the panel opens on Participants — the only tab
    // there is — instead of an empty Chat tab.
    attrOpt: { "data-open": startOpen ? "1" : "0", "data-tab": mayChat ? "chat" : "participants" },
    dataset: { open: startOpen ? 1 : 0, tab: mayChat ? "chat" : "participants" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__chat-header`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__chat-tabs`,
            kids: [
              mayChat ? tab("chat", LOCALE.CHAT) : "",
              tab("participants", LOCALE.PARTICIPANTS),
            ],
          }),
          Skeletons.Button.Svg({
            ico: "meet-x",
            className: `${pfx}__chat-close`,
            // Explicit close (not a toggle) so it can never re-open itself.
            service: "close-chat",
            uiHandler: [_ui_],
          }),
        ],
      }),
      // Participants pane: roster toolbar + members roster.
      Skeletons.Box.Y({
        className: `${pfx}__pane ${pfx}__pane-participants`,
        kids: [
          // Roster toolbar (Figma): invite CTA + search / sort. Visual for now
          // — the invite/search/sort backends are not yet wired, so the whole
          // toolbar is hidden until then. Keep the markup for the re-enable.
          // Skeletons.Box.X({
          //   className: `${pfx}__roster-header`,
          //   kids: [
          //     Skeletons.Button.Label({
          //       className: `${pfx}__roster-invite`,
          //       ico: "meet-user-plus",
          //       label: LOCALE.INVITE_PEOPLE,
          //       labelClass: `${pfx}__roster-invite-label`,
          //       attrOpt: { title: LOCALE.INVITE_PEOPLE },
          //     }),
          //     Skeletons.Box.X({
          //       className: `${pfx}__roster-tools`,
          //       kids: [
          //         Skeletons.Button.Svg({
          //           ico: "meet-search",
          //           className: `${pfx}__roster-tool`,
          //         }),
          //         Skeletons.Button.Svg({
          //           ico: "meet-sort",
          //           className: `${pfx}__roster-tool`,
          //         }),
          //       ],
          //     }),
          //   ],
          // }),
          // Members roster (rows re-rendered in place by _refreshMember).
          Skeletons.Box.Y({
            className: `${pfx}__pane-roster`,
            sys_pn: "participants-roster",
            partHandler: [_ui_],
            kids: [require("./members-list")(_ui_)],
          }),
        ],
      }),
      // Chat pane. Omitted entirely without the chat right — a mounted composer
      // whose every send is refused is worse than no composer. Safe to drop:
      // _bindChatUnread's ensurePart("meeting-chat-widget") simply never
      // resolves (it has its own .catch), so nothing binds and nothing throws.
      !mayChat ? "" : Skeletons.Box.Y({
        className: `${pfx}__pane ${pfx}__pane-chat`,
        kids: [
          {
            kind: "widget_chat",
            className: `${pfx}__chat-widget`,
            type: chatArea,
            area: chatArea,
            view: "quickChat",
            // Team-meeting: same channel as the folder chat (folder-scoped
            // share channel keyed by actual_hub_id + actual_home_id). The
            // upload destination resolves from hub_id via media.home in
            // widget_chat. Falls back to the room's own ids otherwise.
            scope: isTeamChannel ? _a.folder : undefined,
            hub_id:
              (isTeamChannel && _ui_.mget(_a.actual_hub_id)) ||
              _ui_.mget(_a.hub_id),
            nid: isTeamChannel ? teamChatNid : _ui_.mget(_a.nid),
            home_id: isTeamChannel
              ? _ui_.mget(_a.home_id) || teamChatNid
              : undefined,
            ownpath: isTeamChannel ? _ui_.mget(_a.ownpath) : undefined,
            placeholder: LOCALE.TYPE_MESSAGE + "...",
            no_emoji: false,
            send_icon: "raw-send-chat",
            attach_icon: "chat-link-simple",
            sys_pn: "meeting-chat-widget",
            // partHandler is what registers the widget as an addressable part;
            // sys_pn alone is not enough. Needed so the meeting can reach the
            // instance via ensurePart and subscribe to "message-received" for
            // the unread badge (see _bindChatUnread).
            partHandler: [_ui_],
          },
        ],
      }),
    ],
  });
}

const __skl_window_meeting = function (_ui_, localUser) {
  const mode = _ui_.mget(_a.mode) || "";
  const area = _ui_.mget(_a.area);
  const role = _ui_.mget(_a.role);

  const body = require('builtins/webrtc/skeleton')(_ui_, localUser);

  // Row layout: video stage (flex:1) on the left, the side panel as a real
  // right-hand column (flex sibling, never an overlay).
  const kids = [body];
  const panel = meetingSidePanel(_ui_);
  if (panel) kids.push(panel);

  // Full emoji picker for the reactions "…" (more) button. Mounted empty and
  // fed on demand from meeting._toggleReactionsPicker (reuses the shared
  // assets/emojis picker); a picked glyph is broadcast as a reaction.
  kids.push(
    Skeletons.Wrapper.Y({
      className: `${_ui_.fig.family}__reactions-picker`,
      name: "reactions",
    }),
  );

  // Bottom-left overlay where sent reactions rise (Figma "reaction-sent",
  // node 2578-31083). A single stage-wide, click-through layer; every
  // reaction — local or from a peer — floats here, labelled with the sender's
  // name, regardless of whose tile they're on.
  kids.push(
    Skeletons.Box.Y({
      className: `${_ui_.fig.family}__reaction-stack`,
      sys_pn: "reaction-stack",
    }),
  );

  // Bottom-left stack of transient "X joined" / "X left" notices, kept out of
  // the top-center message-container (the connection-status surface).
  // See _partyToast in window/meeting/index.js.
  kids.push(
    Skeletons.Box.Y({
      className: `${_ui_.fig.family}__party-toasts`,
      sys_pn: "party-toasts",
    }),
  );

  // Always-visible "LIVE" mark for the parked tile (the cover below only shows
  // on hover). Hidden by the skin at full size.
  kids.push(
    Skeletons.Box.X({
      className: `${_ui_.fig.family}__call-tile-live`,
      kidsOpt: { active: 0 },
      active: 0,
      kids: [
        Skeletons.Box.X({
          className: `${_ui_.fig.family}__call-tile-live-dot`,
          active: 0,
        }),
        Skeletons.Note({
          className: `${_ui_.fig.family}__call-tile-live-label`,
          content: LOCALE.LIVE,
          active: 0,
        }),
      ],
    }),
  );

  // Return-to-call cover. Hidden until the window is parked as a corner tile
  // (data-call-tile="1", set by meeting.setCallTile when the desk navigates
  // away). It then covers the whole tile, so the single click that reaches this
  // window brings the call back to size instead of hitting a 300px-wide copy of
  // the in-call controls.
  kids.push(
    Skeletons.Box.Z({
      className: `${_ui_.fig.family}__call-tile-cover`,
      sys_pn: "call-tile-cover",
      service: "restore-call",
      uiHandler: [_ui_],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({
          ico: "meet-expand",
          className: `${_ui_.fig.family}__call-tile-ico`,
        }),
        Skeletons.Note({
          className: `${_ui_.fig.family}__call-tile-label`,
          content: LOCALE.RETURN_TO_CALL,
        }),
      ],
    }),
  );

  const a = Skeletons.Box.X({
    debug: __filename,
    sys_pn: 'xxcontent',
    className: `${_ui_.fig.family}__main ${mode} ${area} ${role}`,
    kids
  });

  return a;
};

module.exports = __skl_window_meeting;

/**
 * Chat details panel (Figma 775:131699 overview, 775:132297..132300 pages).
 * Fed into the folder window's "chat-details" part by _openChatDetails /
 * _showChatDetailsPage. Pure descriptors — every click is a `service` the
 * folder window's onUiEvent handles.
 */
const M = require("./model");
// The glyph a chat attachment chip draws for a file (office types keep their
// coloured raw icons) — one icon set for chat, task comments and this list.
const { chipGlyph } = require("../../../libs/file-meta");

// Class prefix of every element: the widget sets cdPrefix
// ("widget-chat-details"); anything else (the folder window's own slot, the
// tests' fakes) falls back to "<fig.group>__chat-details".
function cdPfx(ui) {
  return ui.cdPrefix || `${ui.fig.group}__chat-details`;
}

function header(ui, title, { back = false } = {}) {
  const pfx = cdPfx(ui);
  return Skeletons.Box.X({
    className: `${pfx}-header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-title-wrap`,
        kids: [
          back
            ? Skeletons.Button.Svg({
                className: `${pfx}-back`,
                ico: "arrow-left",
                service: "chat-details-back",
                uiHandler: [ui],
              })
            : null,
          Skeletons.Note({ className: `${pfx}-title`, content: title }),
        ].filter(Boolean),
      }),
      Skeletons.Button.Svg({
        className: `${pfx}-close`,
        ico: "meet-x",
        service: "close-chat-details",
        uiHandler: [ui],
      }),
    ],
  });
}

function actionTile(ui, service, ico, label, { modifier, dataset } = {}) {
  const pfx = cdPfx(ui);
  return Skeletons.Box.Y({
    className: modifier ? `${pfx}-action ${pfx}-action--${modifier}` : `${pfx}-action`,
    service,
    dataset,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({ className: `${pfx}-action-ico`, ico }),
      Skeletons.Note({ className: `${pfx}-action-label`, content: label }),
    ],
  });
}

/**
 * The "Meeting" tile mirrors the Meet schedule's start button
 * (window-folder__meeting-sched-start-btn, skeleton/meeting-schedule.js):
 *   joined → "Joined", locked (the user is in this room's call)
 *   active → "Join meeting" (a call is live here, the viewer is not in it)
 *   idle   → "Meeting" (Figma's label; starts the call)
 * Starting is edit-tier (canUpload, fail-open when absent); joining is not —
 * so the tile is dropped only when it could only START one.
 * Also read by the folder window to refresh a mounted tile in place.
 */
function meetingTileState(ui) {
  const joined = !!(
    ui._meetingJoined ||
    (typeof ui._meetingWindowLive === "function" && ui._meetingWindowLive())
  );
  const active = !joined && !!ui._meetingActive;
  const mayStart = typeof ui.canUpload !== "function" ? true : !!ui.canUpload();
  return {
    label: joined ? LOCALE.JOINED : active ? LOCALE.JOIN_MEETING : LOCALE.MEETING,
    joined,
    hidden: !mayStart && !joined && !active,
  };
}

function meetingTile(ui) {
  // A host can own the call state (the folder window's Meet start button);
  // the widget asks it through chatDetailsMeetingState().
  const st = ui.chatDetailsMeetingState ? ui.chatDetailsMeetingState() : meetingTileState(ui);
  if (st.hidden) return null;
  return actionTile(ui, "chat-details-meeting", "noti-video-camera", st.label, {
    modifier: "meeting",
    dataset: { joined: st.joined ? 1 : 0 },
  });
}

function threadRows(ui, threads) {
  const pfx = cdPfx(ui);
  if (!threads || !threads.length) return null;
  return Skeletons.Box.Y({
    className: `${pfx}-threads`,
    kids: [
      Skeletons.Note({ className: `${pfx}-section-label`, content: LOCALE.FILE_THREADS }),
      // Own box so a long list scrolls under the fixed label (skin: -thread-list).
      Skeletons.Box.Y({
        className: `${pfx}-thread-list`,
        kids: threads.map((it) => {
          const name = it.user_filename || it.filename || "";
          const unread = it.unread != null ? it.unread : it.unread_count;
          return Skeletons.Box.X({
            className: `${pfx}-thread`,
            service: "chat-details-thread",
            file_nid: `${it.file_nid || ""}`,
            filename: name,
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Image.Svg({ className: `${pfx}-thread-ico`, ico: "app-attachment" }),
              Skeletons.Note({ className: `${pfx}-thread-name`, content: name }),
              Number(unread) > 0
                ? Skeletons.Note({ className: `${pfx}-badge`, content: `${unread}` })
                : null,
            ].filter(Boolean),
          });
        }),
      }),
    ],
  });
}

const COUNT_ICO = { photo: "ph-image", video: "ph-video", file: "ph-file", link: "apps-link-simple" };
const STAT_KEY = { photo: "photos", video: "videos", file: "files", link: "links" };

function countRows(ui, stats = {}) {
  const pfx = cdPfx(ui);
  return Skeletons.Box.Y({
    className: `${pfx}-counts`,
    kids: M.PAGES.map((page) =>
      Skeletons.Box.X({
        className: `${pfx}-count`,
        service: "chat-details-page",
        page,
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ className: `${pfx}-count-ico`, ico: COUNT_ICO[page] }),
          Skeletons.Note({
            className: `${pfx}-count-label`,
            content: M.countLabel(stats[STAT_KEY[page]], page),
          }),
        ],
      }),
    ),
  });
}

function memberRows(ui, members, participants = false) {
  const pfx = cdPfx(ui);
  const list = M.uniqueMembers(members);
  return Skeletons.Box.Y({
    className: `${pfx}-members`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-members-head`,
        kids: [
          Skeletons.Image.Svg({ className: `${pfx}-count-ico`, ico: "ph-users" }),
          Skeletons.Note({
            className: `${pfx}-section-label`,
            // Direct conversation: the two participants, not a member count.
            content: participants ? LOCALE.CD_PARTICIPANTS : LOCALE.CD_MEMBERS.format(list.length),
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-members-list`,
        kids: list.map((m) => {
          const seen = M.lastSeenLabel(m);
          return Skeletons.Box.X({
            className: `${pfx}-member`,
            kids: [
              { kind: KIND.profile, className: `${pfx}-avatar`, id: m.id, firstname: m.firstname, lastname: m.lastname, active: 0 },
              Skeletons.Box.Y({
                className: `${pfx}-member-text`,
                kids: [
                  Skeletons.Note({ className: `${pfx}-member-name`, content: m.fullname || m.email || "" }),
                  Skeletons.Note({
                    className: `${pfx}-member-status`,
                    dataset: { online: seen.online ? 1 : 0 },
                    content: seen.text,
                  }),
                ],
              }),
            ],
          });
        }),
      }),
    ],
  });
}

// ── Loading skeletons ──────────────────────────────────────────────────────
// Grey placeholder shapes (skin: -sk, pulsing like the rest of the app) laid
// out like the content they stand for, so nothing reads as real data — the
// empty overview used to show "0 photos" and no members until the fetch
// landed. Plain boxes; CSS gives each block its shape.
function sk(pfx, ...mods) {
  return Skeletons.Box.X({
    className: [`${pfx}-sk`, ...mods.map((m) => `${pfx}-sk--${m}`)].join(" "),
  });
}

function skRow(pfx, kind, lead, bars) {
  return Skeletons.Box.X({
    className: `${pfx}-sk-row ${pfx}-sk--${kind}`,
    kids: [
      sk(pfx, lead),
      Skeletons.Box.Y({
        className: `${pfx}-sk-lines`,
        kids: bars.map((w) => sk(pfx, "bar", w)),
      }),
    ],
  });
}

function overviewSkeleton(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}-skeleton`,
    dataset: { page: "overview" },
    kids: [
      // File Threads: label + rows
      Skeletons.Box.Y({
        className: `${pfx}-sk-section`,
        kids: [sk(pfx, "bar", "w30"), ...["w60", "w45", "w70"].map((w) => skRow(pfx, "thread", "icon", [w]))],
      }),
      // The four counts
      Skeletons.Box.Y({
        className: `${pfx}-sk-section`,
        kids: ["w30", "w25", "w25", "w40"].map((w) => skRow(pfx, "count", "icon", [w])),
      }),
      Skeletons.Note({ className: `${pfx}-divider` }),
      // Members: header + rows (avatar, name over status)
      Skeletons.Box.Y({
        className: `${pfx}-sk-section`,
        kids: [
          sk(pfx, "bar", "w25"),
          ...["w40", "w50", "w35", "w45", "w30"].map((w) => skRow(pfx, "member", "circle", [w, "w25"])),
        ],
      }),
    ],
  });
}

function pageSkeleton(pfx, page) {
  let kids;
  if (page === "photo") {
    kids = [Skeletons.Box.X({ className: `${pfx}-grid`, kids: Array.from({ length: 14 }, () => sk(pfx, "tile")) })];
  } else if (page === "video") {
    kids = [
      sk(pfx, "bar", "w25", "month"),
      Skeletons.Box.X({ className: `${pfx}-grid`, kids: Array.from({ length: 7 }, () => sk(pfx, "tile")) }),
    ];
  } else if (page === "file") {
    kids = ["w60", "w45", "w70", "w50", "w65", "w40"].map((w) => skRow(pfx, "file", "square", [w]));
  } else {
    kids = ["w80", "w70", "w75", "w65"].map((w) => skRow(pfx, "link", "thumb", [w, "w50"]));
  }
  return Skeletons.Box.Y({ className: `${pfx}-skeleton`, dataset: { page }, kids });
}

function chatDetailsOverview(ui, data = {}) {
  const pfx = cdPfx(ui);
  // Which sections this conversation kind has (widget/chat-details/modes);
  // everything when unspecified (the folder window's workspace chat).
  const sec = { threads: 1, mute: 1, download: 1, meeting: 1, ...(data.sections || {}) };
  return [
    header(ui, LOCALE.CD_CHAT_DETAILS),
    Skeletons.Box.X({
      className: `${pfx}-actions`,
      kids: [
        sec.mute
          ? actionTile(ui, "chat-details-mute", "top-bell", data.muted ? LOCALE.CD_UNMUTE : LOCALE.MUTE)
          : null,
        sec.meeting ? meetingTile(ui) : null,
        sec.download
          ? actionTile(ui, "chat-details-download", "dl-download-simple", LOCALE.DOWNLOAD)
          : null,
      ].filter(Boolean),
    }),
    // Header and actions are real from the first frame (they need no data);
    // the rest is a placeholder until the details fetch lands.
    ...(data.loading
      ? [overviewSkeleton(pfx)]
      : [
          sec.threads ? threadRows(ui, data.threads) : null,
          countRows(ui, data.stats),
          Skeletons.Note({ className: `${pfx}-divider` }),
          memberRows(ui, data.members, !!data.participants),
        ]),
  ].filter(Boolean);
}

function mediaTile(ui, row) {
  const pfx = cdPfx(ui);
  const isVideo = row.category === "video";
  const dur = isVideo ? M.durationLabel(row.duration) : "";
  const fallbackHub = ui.mget(_a.actual_hub_id) || ui.mget(_a.hub_id);
  const url = M.thumbUrl(row, fallbackHub, bootstrap());
  const name = row.filename || "";
  // The tile is the clickable item (service, loading stamp, hover); the
  // picture lives in its -thumb box and the file name sits under it.
  return Skeletons.Box.Y({
    className: `${pfx}-tile`,
    service: "chat-details-open-media",
    // The hub the node lives in: a DM attachment sits in its sender's wicket.
    hub_id: row.hub_id || fallbackHub || "",
    nid: `${row.nid}`,
    filetype: row.category,
    filename: name,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-thumb`,
        kids: [
          Skeletons.Image.Smart({
            className: `${pfx}-tile-img`,
            low: url,
            high: url,
          }),
          // Every video carries the play badge (so it never reads as a photo);
          // the duration text only when known — channel.media_list fills it in
          // from the node's info.json.
          isVideo
            ? Skeletons.Box.X({
                className: `${pfx}-duration`,
                kids: [
                  Skeletons.Image.Svg({ className: `${pfx}-duration-ico`, ico: "ph-play-fill" }),
                  dur ? Skeletons.Note({ className: `${pfx}-duration-text`, content: dur }) : null,
                ].filter(Boolean),
              })
            : null,
        ].filter(Boolean),
      }),
      // attrOpt → a real title attribute: the full name on hover.
      Skeletons.Note({ className: `${pfx}-tile-name`, content: name, attrOpt: { title: name } }),
    ],
  });
}

function fileRow(ui, row) {
  const pfx = cdPfx(ui);
  const ext = `${row.extension || ""}`.toLowerCase();
  return Skeletons.Box.X({
    className: `${pfx}-file`,
    service: "chat-details-open-media",
    nid: `${row.nid}`,
    hub_id: row.hub_id || ui.mget(_a.actual_hub_id) || ui.mget(_a.hub_id) || "",
    filetype: row.category,
    filename: row.filename || "",
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-file-ico`,
        // data-ext lets the skin whiten the office icons' page body, exactly
        // as the chat attachment chip does.
        dataset: { ext },
        kids: [Skeletons.Image.Svg({ ico: chipGlyph({ extension: ext }) })],
      }),
      Skeletons.Note({ className: `${pfx}-file-name`, content: row.filename || "" }),
    ],
  });
}

function linkRow(ui, row) {
  const pfx = cdPfx(ui);
  const url = row.url || M.extractUrl(row.preview);
  return Skeletons.Box.X({
    className: `${pfx}-link`,
    service: "chat-details-open-link",
    url,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-link-thumb`,
        kids: [Skeletons.Image.Svg({ ico: "apps-link-simple" })],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-link-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}-link-msg`, content: row.preview || "" }),
          Skeletons.Note({ className: `${pfx}-link-url`, content: url }),
        ],
      }),
    ],
  });
}

function chatDetailsPage(ui, page, rows = [], { loading = false } = {}) {
  const pfx = cdPfx(ui);
  const head = header(ui, M.pageTitle(page), { back: true });
  if (loading) {
    return [head, pageSkeleton(pfx, page)];
  }
  if (!rows.length) {
    return [head, Skeletons.Note({ className: `${pfx}-empty`, content: LOCALE.CD_NOTHING_YET })];
  }
  let body;
  if (page === "video") {
    body = M.groupByMonth(rows).map((g) =>
      Skeletons.Box.Y({
        className: `${pfx}-month`,
        kids: [
          Skeletons.Note({ className: `${pfx}-month-label`, content: g.label }),
          Skeletons.Box.X({ className: `${pfx}-grid`, kids: g.rows.map((r) => mediaTile(ui, r)) }),
        ],
      }),
    );
  } else if (page === "photo") {
    body = [Skeletons.Box.X({ className: `${pfx}-grid`, kids: rows.map((r) => mediaTile(ui, r)) })];
  } else if (page === "file") {
    body = rows.map((r) => fileRow(ui, r));
  } else {
    body = rows.map((r) => linkRow(ui, r));
  }
  return [
    head,
    Skeletons.Box.Y({
      className: `${pfx}-body`,
      sys_pn: "chat-details-body",
      partHandler: ui,
      dataset: { page },
      kids: body,
    }),
  ];
}

/**
 * The empty "chat-details" part that sits beside .window__chat-panel in the
 * folder window's split body (window/skeleton/toolkit folderFilesView). Filled
 * by chat-details/controller when the ⋮ opens it. Workspace folder chat only:
 * a share-token window gets none, since member lists and media counts are
 * workspace data a share recipient must not see.
 */
function chatDetailsPanel(ui) {
  if (ui.fig.family !== "window-folder" || ui.mget(_a.token)) return null;
  return Skeletons.Box.Y({
    className: `${ui.fig.group}__chat-details`,
    sys_pn: "chat-details",
    partHandler: ui,
    dataset: {
      page: "overview",
      chat_gated: Number(ui.mget(_a.privilege)) & _K.permission.download ? 0 : 1,
    },
  });
}

/**
 * What the team-chat header ⋮ does: open Chat details on a workspace folder
 * window; keep the thread-switch dropdown everywhere else (share-token
 * windows, and any other family that reuses chatHeaderBar).
 */
function headerMenuService(ui) {
  return ui.fig.family === "window-folder" && !ui.mget(_a.token)
    ? "open-chat-details"
    : "open-thread-menu";
}

/**
 * Does the Chat tab's "# General" header get the ⋮? Only where the ⋮ opens
 * Chat details (a workspace folder window). There the rail already switches
 * threads, so on a share-token window — whose ⋮ would be the thread menu —
 * the header stays search-only, as before.
 */
function generalHeaderMenu(ui) {
  return headerMenuService(ui) === "open-chat-details";
}

module.exports = {
  generalHeaderMenu,
  chatDetailsOverview,
  chatDetailsPage,
  chatDetailsPanel,
  headerMenuService,
  meetingTileState,
};

/**
 * Chat details panel (Figma 775:131699 overview, 775:132297..132300 pages).
 * Fed into the folder window's "chat-details" part by _openChatDetails /
 * _showChatDetailsPage. Pure descriptors — every click is a `service` the
 * folder window's onUiEvent handles.
 */
const M = require("../chat-details/model");
// The glyph a chat attachment chip draws for a file (office types keep their
// coloured raw icons) — one icon set for chat, task comments and this list.
const { chipGlyph } = require("../../../../libs/file-meta");

function header(ui, title, { back = false } = {}) {
  const pfx = `${ui.fig.group}__chat-details`;
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

function actionTile(ui, service, ico, label) {
  const pfx = `${ui.fig.group}__chat-details`;
  return Skeletons.Box.Y({
    className: `${pfx}-action`,
    service,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({ className: `${pfx}-action-ico`, ico }),
      Skeletons.Note({ className: `${pfx}-action-label`, content: label }),
    ],
  });
}

function threadRows(ui, threads) {
  const pfx = `${ui.fig.group}__chat-details`;
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
  const pfx = `${ui.fig.group}__chat-details`;
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

function memberRows(ui, members) {
  const pfx = `${ui.fig.group}__chat-details`;
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
            content: LOCALE.CD_MEMBERS.format(list.length),
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

function chatDetailsOverview(ui, data = {}) {
  const pfx = `${ui.fig.group}__chat-details`;
  return [
    header(ui, LOCALE.CD_CHAT_DETAILS),
    Skeletons.Box.X({
      className: `${pfx}-actions`,
      kids: [
        actionTile(ui, "chat-details-mute", "top-bell", data.muted ? LOCALE.CD_UNMUTE : LOCALE.MUTE),
        actionTile(ui, "chat-details-meeting", "noti-video-camera", LOCALE.MEETING),
        actionTile(ui, "chat-details-download", "dl-download-simple", LOCALE.DOWNLOAD),
      ],
    }),
    threadRows(ui, data.threads),
    countRows(ui, data.stats),
    Skeletons.Note({ className: `${pfx}-divider` }),
    memberRows(ui, data.members),
  ].filter(Boolean);
}

function mediaTile(ui, row) {
  const pfx = `${ui.fig.group}__chat-details`;
  const dur = row.category === "video" ? M.durationLabel(row.duration) : "";
  const url = M.thumbUrl(row, ui.mget(_a.actual_hub_id) || ui.mget(_a.hub_id), bootstrap());
  return Skeletons.Box.Y({
    className: `${pfx}-tile`,
    service: "chat-details-open-media",
    nid: `${row.nid}`,
    filetype: row.category,
    filename: row.filename || "",
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Smart({
        className: `${pfx}-tile-img`,
        low: url,
        high: url,
      }),
      dur
        ? Skeletons.Box.X({
            className: `${pfx}-duration`,
            kids: [
              Skeletons.Image.Svg({ className: `${pfx}-duration-ico`, ico: "ph-play-fill" }),
              Skeletons.Note({ className: `${pfx}-duration-text`, content: dur }),
            ],
          })
        : null,
    ].filter(Boolean),
  });
}

function fileRow(ui, row) {
  const pfx = `${ui.fig.group}__chat-details`;
  const ext = `${row.extension || ""}`.toLowerCase();
  return Skeletons.Box.X({
    className: `${pfx}-file`,
    service: "chat-details-open-media",
    nid: `${row.nid}`,
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
  const pfx = `${ui.fig.group}__chat-details`;
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
  const pfx = `${ui.fig.group}__chat-details`;
  const head = header(ui, M.pageTitle(page), { back: true });
  if (loading) {
    return [head, Skeletons.Box.Y({ className: `${pfx}-loading` })];
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

module.exports = { chatDetailsOverview, chatDetailsPage, chatDetailsPanel, headerMenuService };

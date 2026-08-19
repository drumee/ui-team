/**
 * Step 2 / screen 2 — the folder's Chat tab with a file thread open.
 *
 * Figma: node 3202:3732 ("DRUMEE: Tutorial (Chat Feature)"). The app behind
 * the callout is a flat bitmap in that file, so the layout here is measured
 * off the 1:1 render: thread panel 340px, file-thread card #FFF on #F2F2F7,
 * pink outgoing bubble #FFA8DC, purple accents #B1ADFF / #847EFF.
 *
 * Visual only — no services. Two parts matter: `thread-panel` (what the
 * spotlight lights) and `thread-card` (what the callout points at).
 */

const { folderHeader, tabBar } = require("./folder");

// ── Static data ───────────────────────────────────────────────────────────────
const FILE_THREADS = [
  "Drumee_Strategy_Q2",
  "Drumee_Reddit_Content",
  "2_Drumee_Premium_Visual02",
];

const STREAM = [
  {
    sender: "Sarah K.",
    text: "Agreed. Feel free to leave comments directly in the file.",
    time: "11:53 AM",
  },
  {
    sender: "Emma",
    text: "I noticed some screenshots in the onboarding section are outdated. They're showing the old workspace creation flow.",
    time: "11:53 AM",
  },
  {
    sender: "Sarah K.",
    text: "Good catch. Can you update them or share the latest assets?",
    time: "11:53 AM",
  },
];

const THREAD_FILE = "Drumee_Strategy_Q2";

// ── Left rail: this folder + file threads ─────────────────────────────────────
function railSection(pfx, title, kids) {
  return Skeletons.Box.Y({
    className: `${pfx}__th-rail-section`,
    kids: [
      Skeletons.Note({ className: `${pfx}__th-rail-title`, content: title }),
      ...kids,
    ],
  });
}

function railChannel(pfx, name, badge) {
  return Skeletons.Box.X({
    className: `${pfx}__th-rail-channel`,
    kids: [
      Skeletons.Note({ className: `${pfx}__th-rail-hash`, content: "#" }),
      Skeletons.Note({ className: `${pfx}__th-rail-name`, content: name }),
      badge
        ? Skeletons.Note({ className: `${pfx}__th-rail-badge`, content: badge })
        : null,
    ],
  });
}

function railThread(pfx, name, badge) {
  return Skeletons.Box.X({
    className: `${pfx}__th-rail-thread`,
    kids: [
      Skeletons.Image.Svg({
        ico: "app-attachment",
        className: `${pfx}__th-rail-clip`,
      }),
      Skeletons.Note({ className: `${pfx}__th-rail-name`, content: name }),
      badge
        ? Skeletons.Note({ className: `${pfx}__th-rail-badge`, content: badge })
        : null,
    ],
  });
}

function threadRail(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__th-rail`,
    kids: [
      railSection(pfx, LOCALE.THIS_FOLDER || "This Folder", [
        railChannel(pfx, "General", "16"),
      ]),
      railSection(
        pfx,
        LOCALE.FILE_THREADS || "File Threads",
        FILE_THREADS.map((n, i) => railThread(pfx, n, i === 2 ? "16" : null)),
      ),
      Skeletons.Box.X({
        className: `${pfx}__th-rail-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__th-rail-footer-label`,
            content: LOCALE.DOWNLOAD_CHAT_HISTORY || "Download Chat history",
          }),
          Skeletons.Image.Svg({
            ico: "download",
            className: `${pfx}__th-rail-footer-icon`,
          }),
        ],
      }),
    ],
  });
}

// ── Centre: the #General stream ───────────────────────────────────────────────
function streamMessage(pfx, msg) {
  return Skeletons.Box.X({
    className: `${pfx}__th-msg`,
    kids: [
      Skeletons.Box.Y({ className: `${pfx}__th-msg-avatar` }),
      Skeletons.Box.Y({
        className: `${pfx}__th-msg-body`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__th-msg-sender`,
            content: msg.sender,
          }),
          Skeletons.Note({
            className: `${pfx}__th-msg-bubble`,
            content: msg.text,
          }),
          Skeletons.Note({
            className: `${pfx}__th-msg-time`,
            content: msg.time,
          }),
        ],
      }),
    ],
  });
}

function threadStream(ui, pfx, opt = {}) {
  return Skeletons.Box.Y({
    className: `${pfx}__th-stream`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__th-stream-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__th-stream-title`,
            content: "# General",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__th-stream-body`,
        kids: [
          ...STREAM.map((m) => streamMessage(pfx, m)),
          // Screen 2 only: the file message the hover bar sits on.
          opt.hint ? hintMessage(ui, pfx) : "",
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__th-stream-input`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__th-stream-placeholder`,
            content: LOCALE.WRITE_A_MESSAGE || "Type a message...",
          }),
          Skeletons.Image.Svg({
            ico: "meet-smiley",
            className: `${pfx}__th-stream-icon`,
          }),
          Skeletons.Image.Svg({
            ico: "send",
            className: `${pfx}__th-stream-icon`,
          }),
        ],
      }),
    ],
  });
}

// ── Right: the open file thread (spotlight target lives in here) ──────────────
function threadCard(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__th-card`,
    // The panel is what gets lit, but the callout points HERE — the design
    // marks the Drumee_Strategy_Q2 thread card, not the panel's mid-height.
    sys_pn: "thread-card",
    partHandler: ui,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__th-card-icon-box`,
        kids: [
          Skeletons.Image.Svg({
            ico: "app-attachment",
            className: `${pfx}__th-card-icon`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__th-card-body`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__th-card-name`,
            content: THREAD_FILE,
          }),
          Skeletons.Box.X({
            className: `${pfx}__th-card-meta`,
            kids: [
              Skeletons.Image.Svg({
                ico: "meet-chat-dots",
                className: `${pfx}__th-card-meta-icon`,
              }),
              Skeletons.Note({
                className: `${pfx}__th-card-meta-text`,
                content: `10 ${LOCALE.REPLIES || "replies"}`,
              }),
              Skeletons.Note({
                className: `${pfx}__th-card-meta-dot`,
                content: "•",
              }),
              Skeletons.Note({
                className: `${pfx}__th-card-meta-text`,
                content: "2 hours ago",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__th-card-open`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__th-card-open-label`,
            content: `${LOCALE.OPEN_FILE || "Open file"} →`,
          }),
        ],
      }),
    ],
  });
}

function threadBubble(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__th-bubble-wrap`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__th-bubble`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__th-bubble-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__th-bubble-link`,
                content: `/${THREAD_FILE}`,
              }),
              Skeletons.Note({
                className: `${pfx}__th-bubble-rest`,
                content:
                  " file chat thread start here everyone please reply this message",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__th-bubble-file`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__th-bubble-file-icon-box`,
                kids: [
                  // app-pdf-file, not file-pdf: the latter is a solid page
                  // silhouette, the design shows the labelled PDF page.
                  Skeletons.Image.Svg({
                    ico: "app-pdf-file",
                    className: `${pfx}__th-bubble-file-icon`,
                  }),
                ],
              }),
              Skeletons.Box.Y({
                className: `${pfx}__th-bubble-file-body`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__th-bubble-file-name`,
                    content: `/${THREAD_FILE}`,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__th-bubble-file-meta`,
                    content: `1.2 MB - ${LOCALE.SHOW_IN_FOLDER || "Show in folder"}`,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__th-bubble-time`,
        content: "11:53 AM",
      }),
    ],
  });
}

// ── Screen 2: the hover toolbar that starts a thread ──────────────────────────
//
// Figma 3202:3732 ("DRUMEE: Tutorial (Chat Feature)"). This is the REAL chat
// message hover bar with its "Reply in thread" tooltip showing — the same
// component, icon for icon, that builtins/widget/chat-item/skeleton/menu.js
// builds on a live message: reply, a divider, reply-in-thread, copy, forward,
// trash, check, smiley. Mirrored here as static markup the way ctxmenu.js
// mirrors the real context menu, so the tour teaches the bar the user will
// actually meet.
//
// The design also draws a mouse cursor over the thread icon. Not rendered: in a
// live UI that is the user's own pointer, and the tour has no business drawing
// a second one.
const CHAT_ACTIONS = [
  // Reply-in-thread leads, which is the order the design puts it in and the
  // reason this screen exists — the tooltip and the cursor both point here.
  // Same glyph the file kebab's "Chat Threads" entry uses: one mark, one
  // meaning, wherever the user meets it.
  { ico: "ctxmenu-chat-thread", mark: "thread" },
  { divider: true },
  { ico: "chat-action-reply" },
  { ico: "chat-action-copy" },
  { ico: "chat-action-forward" },
  { ico: "chat-action-trash" },
  { ico: "chat-action-check" },
  { ico: "chat-action-smiley" },
];

function chatActionBar(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__th-actions`,
    sys_pn: "chat-actions",
    partHandler: ui,
    kids: CHAT_ACTIONS.map((a) =>
      a.divider
        ? Skeletons.Box.Y({ className: `${pfx}__th-actions-divider` })
        : Skeletons.Box.Y({
            className: `${pfx}__th-actions-slot${a.mark ? ` ${a.mark}` : ""}`,
            kids: [
              Skeletons.Image.Svg({
                ico: a.ico,
                className: `${pfx}__th-actions-icon`,
              }),
              // The pointer rides the icon it points at rather than being
              // placed by coordinates, so it cannot drift when the bar's
              // contents or the locale's text metrics change.
              a.mark === "thread"
                ? Skeletons.Image.Svg({
                    ico: "tutorial-cursor",
                    className: `${pfx}__th-actions-cursor`,
                  })
                : "",
            ],
          }),
    ),
  });
}

/**
 * The dark bubble above the bar, with its downward caret.
 *
 * Anchored to the FIRST slot (reply-in-thread) rather than centred on the bar,
 * because it labels that one icon — the same way the live toolbar's tooltip
 * sits over whichever action is hovered.
 */
function replyInThreadTip(pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__th-tip`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__th-tip-label`,
        content: LOCALE.REPLY_IN_THREAD || "Reply in thread",
      }),
      Skeletons.Box.Y({ className: `${pfx}__th-tip-caret` }),
    ],
  });
}

/**
 * The file message with the hover bar on it — the last thing in the stream on
 * screen 2. Reuses threadBubble, which is already the exact pink bubble the
 * design shows (link + text + PDF card + time); only the overlay is new.
 */
function hintMessage(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__th-hint`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__th-hint-bar`,
        sys_pn: "chat-hint",
        partHandler: ui,
        kids: [replyInThreadTip(pfx), chatActionBar(ui, pfx)],
      }),
      threadBubble(ui, pfx),
    ],
  });
}

function threadComposer(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__th-composer`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__th-composer-reply`,
        kids: [
          Skeletons.Image.Svg({
            ico: "app-reply",
            className: `${pfx}__th-composer-reply-icon`,
          }),
          Skeletons.Note({
            className: `${pfx}__th-composer-reply-to`,
            content: `${LOCALE.REPLY_TO || "Reply to"} Username`,
          }),
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${pfx}__th-composer-reply-close`,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__th-composer-quote`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__th-composer-quote-file`,
            content: `${THREAD_FILE}.pdf`,
          }),
          Skeletons.Note({
            className: `${pfx}__th-composer-quote-text`,
            content:
              " file chat thread start here everyone please reply this message",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__th-composer-input`,
        kids: [
          Skeletons.Image.Svg({
            ico: "app-attachment",
            className: `${pfx}__th-composer-clip`,
          }),
          Skeletons.Note({
            className: `${pfx}__th-composer-draft`,
            content:
              "Just skimmed through it. The AI Workspace vision looks promising, but I think we should add a few practical use cases.",
          }),
          Skeletons.Image.Svg({
            ico: "meet-smiley",
            className: `${pfx}__th-composer-icon`,
          }),
          Skeletons.Image.Svg({
            ico: "send",
            className: `${pfx}__th-composer-icon send`,
          }),
        ],
      }),
    ],
  });
}

export function threadPanel(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__th-panel`,
    // Spotlight target for this screen: the whole thread panel.
    sys_pn: "thread-panel",
    partHandler: ui,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__th-panel-header`,
        kids: [
          Skeletons.Image.Svg({
            ico: "app-attachment",
            className: `${pfx}__th-panel-clip`,
          }),
          Skeletons.Note({
            className: `${pfx}__th-panel-title`,
            content: THREAD_FILE,
          }),
          Skeletons.Note({
            className: `${pfx}__th-panel-chip`,
            content: LOCALE.FILE_THREAD || "File thread",
          }),
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${pfx}__th-panel-close`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__th-panel-body`,
        kids: [threadCard(ui, pfx), threadBubble(ui, pfx)],
      }),
      threadComposer(ui, pfx),
    ],
  });
}

// ── Screen root ───────────────────────────────────────────────────────────────
/**
 * @param {Object} [opt]
 * @param {Boolean} [opt.hint] show the hover toolbar on the file message —
 *   screen 2's subject. Screen 3 renders the same view without it.
 */
export function threadsView(ui, opt = {}) {
  const pfx = ui.fig.family;
  const aspect = ui.mget("aspect") || "normal";
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    // This screen's folder is a shared one in the design: pink folder, EXTERNAL
    // badge, and the live tab outlined in the same pink (see folder/skin
    // `__main[data-access="shared"]`).
    dataset: { aspect, access: "shared" },
    kids: [
      folderHeader(ui, pfx, { badge: LOCALE.EXTERNAL || "EXTERNAL" }),
      tabBar(ui, pfx, { active: "chat", meeting: true }),
      Skeletons.Box.X({
        className: `${pfx}__content`,
        kids: [threadRail(ui, pfx), threadStream(ui, pfx, opt), threadPanel(ui, pfx)],
      }),
    ],
  });
}

/**
 * The workspace Chat pane, as the tour draws it.
 *
 * Figma 142:39178 (stream), 169:39799 (hover toolbar), 142:39530 and
 * 169:40101 (thread panel). One composer takes the three things that differ
 * between the four screens as flags, because the pane underneath is identical
 * on all of them:
 *
 *   hint    the hover toolbar over the file message
 *   thread  the file-thread panel open on the right
 *   replies the thread has been answered (screen 4)
 *
 * Visual only — no services. Everything a screen can point at carries a
 * `sys_pn`.
 */

const { FILE, TIME, REPLIES_SUMMARY, STREAM, THREAD, ACTIONS } = require('../fixture');
const { emptyState } = require('../../skeleton/toolkit/empty-state');

const avatar = (pfx, name) =>
  Skeletons.Box.Y({ active: 0,
    className: `${pfx}__avatar`,
    kids: [
      Skeletons.Note({ active: 0,
        className: `${pfx}__avatar-text`,
        content: (name || '?').trim().charAt(0).toUpperCase(),
      }),
    ],
  });

/**
 * One message. `msg.own` is the viewer's own side — right-aligned, salmon, and
 * without the name row, exactly as the frames draw it.
 *
 * Shaped the way 142:39178 shapes it: the row is [avatar | stack], with the
 * avatar OUTSIDE the message's own column and the name, bubble and timestamp
 * inside it (186:73694 -> "Incoming Message"). It used to be one column with
 * the avatar and the name sharing a head row above the bubble, which put the
 * bubble flush with the avatar instead of indented past it.
 *
 * The hover toolbar goes in the STACK rather than beside it, so its
 * `top: -46px; right: 0` hangs off the message body and not over the avatar.
 */
function message(ui, pfx, msg, opt = {}) {
  // `link` names a run INSIDE the sentence that the frame draws differently:
  // the first message's text node is three spans, and the middle one — the
  // filename — is 12px underlined plum against the 14px sentence around it
  // (142:39178). The field has been in the fixture all along with nothing
  // reading it, so the name rendered as plain body copy.
  //
  // Built as markup on an Element rather than three sibling Notes, because the
  // run has to sit INLINE in the flowing sentence; three block children would
  // stack. Safe to interpolate: these strings are literals in ../fixture.js,
  // not anything a user can reach.
  const linked = msg.link && msg.text.includes(msg.link);
  const body = [
    linked
      ? Skeletons.Element({ active: 0,
          className: `${pfx}__msg-text`,
          content: msg.text
            .split(msg.link)
            .join(`<span class="${pfx}__msg-link">${msg.link}</span>`),
        })
      : Skeletons.Note({ active: 0, className: `${pfx}__msg-text`, content: msg.text }),
  ];
  if (msg.attachment) {
    body.push(
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__attach`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: 'app-pdf-file', className: `${pfx}__attach-ico` }),
          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__attach-text`,
            kids: [
              Skeletons.Note({ active: 0,
                className: `${pfx}__attach-name`,
                content: msg.attachment.name,
              }),
              Skeletons.Note({ active: 0,
                className: `${pfx}__attach-meta`,
                content: msg.attachment.meta,
              }),
            ],
          }),
        ],
      }),
    );
  }

  const stack = [];
  // The name sits directly above the bubble, inside the message's own column —
  // the avatar is the row's first child and does not share a line with it.
  if (!msg.own) {
    stack.push(Skeletons.Note({ active: 0,
      className: `${pfx}__msg-from`,
      content: msg.from,
    }));
  }
  stack.push(
    Skeletons.Box.Y({ active: 0,
      className: `${pfx}__bubble`,
      // The one message the tour acts on gets a name, so a screen can light it
      // and hang the hover toolbar off it.
      sys_pn: msg.id ? `msg-${msg.id}` : null,
      partHandler: msg.id ? ui : null,
      kids: body,
    }),
  );
  // The hover toolbar belongs to the message it acts on, so it travels with it
  // rather than being positioned against the panel.
  if (opt.hint && msg.id === 'file-message') {
    stack.push(actionBar(ui, pfx));
  }
  stack.push(Skeletons.Note({ active: 0, className: `${pfx}__msg-time`, content: TIME }));

  const col = Skeletons.Box.Y({ active: 0,
    className: `${pfx}__msg-col`,
    kids: stack,
  });

  return Skeletons.Box.X({ active: 0,
    className: `${pfx}__msg`,
    dataset: { own: msg.own ? 1 : 0 },
    attrOpt: { 'data-own': msg.own ? 1 : 0 },
    kids: msg.own ? [col] : [avatar(pfx, msg.from), col],
  });
}

/**
 * The hover toolbar, with its "Reply in thread" tip above it.
 *
 * `hint-thread` is what screen 2 anchors on: the design's beak lands on the
 * reply-in-thread control (drawn as `#` in the frames), not on the bar as a
 * whole.
 */
function actionBar(ui, pfx) {
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__hint`,
    sys_pn: 'hint',
    partHandler: ui,
    kids: [
      Skeletons.Note({ active: 0,
        className: `${pfx}__hint-tip`,
        content: LOCALE.REPLY_IN_THREAD,
      }),
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__hint-bar`,
        // A divider follows the reply-in-thread control, ruling it off from the
        // rest of the bar — 169:40073 draws a 1px vector at x 32, between the
        // Hash (8..24) and the first icon (40..56), with 8px either side.
        kids: ACTIONS.flatMap((a) => (
          a.mark === 'thread'
            ? [barItem(ui, pfx, a), Skeletons.Box.Y({ active: 0, className: `${pfx}__hint-rule` })]
            : [barItem(ui, pfx, a)]
        )),
      }),
    ],
  });
}

/**
 * One control in the hover toolbar. The reply-in-thread mark is the one the
 * callout points at, so it is named and tinted; the rest are plain 16px
 * glyphs. It used to park a `tutorial-cursor` glyph on the mark as well —
 * 169:39799 draws no pointer, and the callout's beak already says which control
 * the screen is about.
 */
function barItem(ui, pfx, a) {
  if (a.mark !== 'thread') {
    return Skeletons.Image.Svg({ active: 0, ico: a.ico, className: `${pfx}__hint-ico` });
  }
  return Skeletons.Box.X({ active: 0,
    className: `${pfx}__hint-mark`,
    sys_pn: 'hint-thread',
    partHandler: ui,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: a.ico, className: `${pfx}__hint-ico` }),
    ],
  });
}

/** The channel / file-thread rail on the left. */
function rail(ui, pfx) {
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__rail`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__rail-body`,
        kids: [
          Skeletons.Note({ active: 0, className: `${pfx}__rail-label`, content: LOCALE.THIS_FOLDER }),
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__rail-row`,
            dataset: { active: 1 },
            attrOpt: { 'data-active': 1 },
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: 'app-folder', className: `${pfx}__rail-ico` }),
              Skeletons.Note({ active: 0, className: `${pfx}__rail-name`, content: LOCALE.GENERAL }),
              Skeletons.Note({ active: 0, className: `${pfx}__rail-badge`, content: '90' }),
            ],
          }),
          Skeletons.Note({ active: 0, className: `${pfx}__rail-label`, content: LOCALE.FILE_THREADS }),
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__rail-row`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: 'app-attachment', className: `${pfx}__rail-ico` }),
              Skeletons.Note({ active: 0, className: `${pfx}__rail-name`, content: FILE }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__rail-foot`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${pfx}__rail-foot-label`,
            content: LOCALE.DOWNLOAD_CHAT_HISTORY,
          }),
          Skeletons.Image.Svg({ active: 0, ico: 'download', className: `${pfx}__rail-ico` }),
        ],
      }),
    ],
  });
}

/**
 * The composer — a white FIELD inset in a grey BAR, which is what the frame
 * draws: 186:73701 "Chat Input" is 1232x69 on Grey/20 with 16px padding, and
 * it holds one 1200x37 Textarea on white at radius 8 (186:73703). This was a
 * single flat grey pill, 44 tall at radius 10 with margins of its own.
 *
 * Two part names, because a screen needs both halves:
 *   `<pn>`         the BAR — what screen 2 lights, since the composer is what
 *                  that screen is about
 *   `<pn>-attach`  the paperclip inside it — what the callout's beak lands on
 *
 * The paperclip is wrapped in a Box rather than carrying `sys_pn` itself:
 * Image.Svg goes through a builder that never mentions sys_pn, and a part that
 * fails to register is not a cosmetic bug — ensurePart has no timeout
 * (ui-core collection-view), so the step would await it forever and the screen
 * would come up with no callout at all. The wrapper hugs the icon, so the beak
 * lands in the same place either way.
 */
const composer = (ui, pfx, pn) =>
  Skeletons.Box.X({ active: 0,
    className: `${pfx}__composer`,
    sys_pn: pn,
    partHandler: pn ? ui : null,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__composer-field`,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__composer-attach`,
            sys_pn: pn ? `${pn}-attach` : null,
            partHandler: pn ? ui : null,
            kids: [
              Skeletons.Image.Svg({ active: 0,
                ico: 'app-attachment',
                className: `${pfx}__composer-ico`,
              }),
            ],
          }),
          Skeletons.Note({ active: 0,
            className: `${pfx}__composer-text`,
            content: LOCALE.TYPE_MESSAGE,
          }),
          // The frame groups the smiley and send at the field's right edge, 12
          // apart, against the 8 between the paperclip and the placeholder.
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__composer-actions`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: 'chat-action-smiley', className: `${pfx}__composer-ico` }),
              Skeletons.Image.Svg({ active: 0, ico: 'send', className: `${pfx}__composer-ico` }),
            ],
          }),
        ],
      }),
    ],
  });

/** The "10 replies" summary the stream shows under a threaded message. */
const threadSummary = (ui, pfx) =>
  Skeletons.Box.X({ active: 0,
    className: `${pfx}__summary`,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: 'app-attachment', className: `${pfx}__summary-ico` }),
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__summary-text`,
        kids: [
          Skeletons.Note({ active: 0, className: `${pfx}__summary-name`, content: FILE }),
          Skeletons.Note({ active: 0,
            className: `${pfx}__summary-meta`,
            content: REPLIES_SUMMARY,
          }),
        ],
      }),
      Skeletons.Note({ active: 0,
        className: `${pfx}__summary-open`,
        content: `${LOCALE.OPEN_THREAD} →`,
      }),
    ],
  });

/** The file-thread side panel. */
function threadPanel(ui, pfx, opt) {
  const msgs = opt.replies ? THREAD : THREAD.slice(0, 1);
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__thread`,
    sys_pn: 'thread',
    partHandler: ui,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__thread-head`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: 'app-attachment', className: `${pfx}__thread-ico` }),
          Skeletons.Note({ active: 0, className: `${pfx}__thread-title`, content: FILE }),
          Skeletons.Note({ active: 0, className: `${pfx}__thread-chip`, content: LOCALE.FILE_THREAD }),
          Skeletons.Image.Svg({ active: 0, ico: 'cross', className: `${pfx}__thread-close` }),
        ],
      }),
      // The file card at the top of the panel — what screen 3 points at.
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__thread-file`,
        sys_pn: 'thread-file',
        partHandler: ui,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: 'app-attachment', className: `${pfx}__thread-file-ico` }),
          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__thread-file-text`,
            kids: [
              Skeletons.Note({ active: 0, className: `${pfx}__thread-file-name`, content: FILE }),
              Skeletons.Note({ active: 0,
                className: `${pfx}__thread-file-meta`,
                content: REPLIES_SUMMARY,
              }),
            ],
          }),
          Skeletons.Note({ active: 0,
            className: `${pfx}__thread-file-open`,
            content: `${LOCALE.OPEN_FILE} →`,
          }),
        ],
      }),
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__thread-body`,
        kids: msgs.map((m) => message(ui, pfx, m)),
      }),
      composer(ui, pfx, 'thread-composer'),
    ],
  });
}

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {Boolean} [opt.empty]   the Chat empty state, which opens the flow
 * @param {Boolean} [opt.hint]    hover toolbar over the file message
 * @param {Boolean} [opt.thread]  file-thread panel open
 * @param {Boolean} [opt.replies] the thread has been answered
 */
module.exports = function (ui, opt = {}) {
  const pfx = ui.fig.family;

  // Screen 1 — Figma 142:38674. The same empty-state shape the Files, Task and
  // Meet flows open on, so it uses the shared composer rather than a fourth
  // copy of it.
  if (opt.empty) {
    return emptyState(ui, {
      title: LOCALE.CHAT_HERO_TITLE,
      desc: LOCALE.CHAT_HERO_DESC,
      cta: LOCALE.START_DISCOVERING,
      items: [{ src: require('assets/tutorial/chat-threads.png').default }],
      card: 'wide',
      // "Start discovering now" carries the tour forward. This screen raises no
      // callout (see `bare` on screen 1 in ../index.js), so without a live CTA
      // it would have no control at all — the same reason the workspace tour's
      // opening screen hands its flow to `home-cta`.
      cta_service: 'next-step',
    });
  }

  return Skeletons.Box.X({ active: 0,
    className: `${pfx}__pane`,
    kids: [
      rail(ui, pfx),
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__main`,
        sys_pn: 'chat-main',
        partHandler: ui,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__head`,
            kids: [
              Skeletons.Note({ active: 0, className: `${pfx}__head-title`, content: `# ${LOCALE.GENERAL}` }),
              Skeletons.Image.Svg({ active: 0, ico: 'magnifying-glass', className: `${pfx}__head-ico` }),
            ],
          }),
          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__stream`,
            sys_pn: 'stream',
            partHandler: ui,
            kids: [
              // The file message arrives WITH the gesture screen 2 teaches, so it
              // is not on screen 2. 142:39178 holds six messages and no file;
              // 169:39799 — the very next frame — adds this seventh at full
              // strength with the hover toolbar over it and the thread tip
              // above that. Showing it on screen 2 put the result of the
              // instruction above the instruction.
              //
              // Kept in the fixture rather than moved out of it: the same entry
              // is what screens 3 to 5 light (`msg-file-message`) and what the
              // thread panel hangs off.
              ...STREAM
                .filter((m) => m.id !== 'file-message' || opt.hint || opt.thread)
                .map((m) => message(ui, pfx, m, { hint: opt.hint })),
              opt.thread ? threadSummary(ui, pfx) : null,
            ].filter(Boolean),
          }),
          composer(ui, pfx, 'composer'),
        ],
      }),
      opt.thread ? threadPanel(ui, pfx, opt) : null,
    ].filter(Boolean),
  });
};

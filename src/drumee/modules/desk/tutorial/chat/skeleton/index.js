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
 */
function message(ui, pfx, msg, opt = {}) {
  const kids = [];
  if (!msg.own) {
    kids.push(
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__msg-head`,
        kids: [avatar(pfx, msg.from), Skeletons.Note({ active: 0,
          className: `${pfx}__msg-from`,
          content: msg.from,
        })],
      }),
    );
  }

  const body = [Skeletons.Note({ active: 0, className: `${pfx}__msg-text`, content: msg.text })];
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

  kids.push(
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
    kids.push(actionBar(ui, pfx));
  }

  kids.push(Skeletons.Note({ active: 0, className: `${pfx}__msg-time`, content: TIME }));

  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__msg`,
    dataset: { own: msg.own ? 1 : 0 },
    attrOpt: { 'data-own': msg.own ? 1 : 0 },
    kids,
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
        kids: ACTIONS.map((a) =>
          a.mark === 'thread'
            ? // The reply-in-thread control: the one the callout points at, so
              // it is named, tinted, and carries the design's cursor.
              Skeletons.Box.X({ active: 0,
                className: `${pfx}__hint-mark`,
                sys_pn: 'hint-thread',
                partHandler: ui,
                kids: [
                  Skeletons.Image.Svg({ active: 0, ico: a.ico, className: `${pfx}__hint-ico` }),
                  Skeletons.Image.Svg({ active: 0,
                    ico: 'tutorial-cursor',
                    className: `${pfx}__hint-cursor`,
                  }),
                ],
              })
            : Skeletons.Image.Svg({ active: 0, ico: a.ico, className: `${pfx}__hint-ico` }),
        ),
      }),
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

const composer = (ui, pfx, pn) =>
  Skeletons.Box.X({ active: 0,
    className: `${pfx}__composer`,
    sys_pn: pn,
    partHandler: pn ? ui : null,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: 'app-attachment', className: `${pfx}__composer-ico` }),
      Skeletons.Note({ active: 0,
        className: `${pfx}__composer-text`,
        content: LOCALE.TYPE_MESSAGE,
      }),
      Skeletons.Image.Svg({ active: 0, ico: 'chat-action-smiley', className: `${pfx}__composer-ico` }),
      Skeletons.Image.Svg({ active: 0, ico: 'send', className: `${pfx}__composer-ico` }),
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
              ...STREAM.map((m) => message(ui, pfx, m, { hint: opt.hint })),
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

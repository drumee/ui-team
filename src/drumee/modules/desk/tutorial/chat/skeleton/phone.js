/**
 * The chat step on a phone — Figma flow "Chat" (386:55913 hero, 386:56395 the
 * stream, 386:56600 the message action sheet, 386:56858 / 386:57195 the file
 * thread). The conversation is the desk mock's own fixture, so both layouts
 * tell the same story.
 */
const ph = require('../../skeleton/toolkit/phone');
const { FILE, TIME, REPLIES_SUMMARY, STREAM, THREAD } = require('../fixture');

const C = 'tutorial-chat__ph';

function workspaceName(ui) {
  const d = ui.mget && ui.mget('subject_data');
  return (d && d.name) || '';
}

function bubble(msg) {
  const own = !!msg.own;
  return Skeletons.Box.Y({
    active: 0,
    className: `${C}-msg`,
    dataset: { own: own ? '1' : '0' },
    attrOpt: { 'data-own': own ? '1' : '0' },
    kids: [
      own ? null : Skeletons.Box.X({
        active: 0,
        className: `${C}-from`,
        kids: [
          Skeletons.Element({ active: 0, className: `${C}-avatar` }),
          Skeletons.Note({ active: 0, className: `${C}-name`, content: msg.from }),
        ],
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${C}-bubble`,
        kids: [
          msg.attachment ? Skeletons.Box.X({
            active: 0,
            className: `${C}-attach`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: 'attachment', className: `${C}-attach-ico` }),
              Skeletons.Note({ active: 0, className: `${C}-attach-name`, content: msg.attachment.name }),
            ],
          }) : null,
          Skeletons.Note({ active: 0, className: `${C}-text`, content: msg.text }),
        ].filter(Boolean),
      }),
      Skeletons.Note({ active: 0, className: `${C}-time`, content: TIME }),
    ].filter(Boolean),
  });
}

function frame(ui, { body, overlay = null }) {
  return ph.screen(ui, {
    top: ph.topBar(ui, { title: workspaceName(ui) }),
    body,
    bottom: ph.composer(ui),
    overlay,
  });
}

// The stream, with the file message held back until the screen about it.
function stream(withFile) {
  return STREAM.filter((m) => withFile || m.id !== 'file-message').map(bubble);
}

/** The long-press sheet (386:56600): three tiles, then the list. */
function actionSheet(ui) {
  const tile = (ico, label, pn) => Skeletons.Box.Y({
    active: 0,
    className: `${C}-tile`,
    ...(pn ? { sys_pn: pn } : {}),
    kids: [
      Skeletons.Image.Svg({ active: 0, ico, className: `${C}-tile-ico` }),
      Skeletons.Note({ active: 0, className: `${C}-tile-label`, content: label }),
    ],
  });
  const item = (ico, label, danger) => Skeletons.Box.X({
    active: 0,
    className: `${C}-item`,
    dataset: { danger: danger ? '1' : '0' },
    attrOpt: { 'data-danger': danger ? '1' : '0' },
    kids: [
      Skeletons.Image.Svg({ active: 0, ico, className: `${C}-item-ico` }),
      Skeletons.Note({ active: 0, content: label }),
    ],
  });
  return ph.sheet(ui, {
    sys_pn: 'ph-act-sheet',
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${C}-tiles`,
        kids: [
          tile('ctxmenu-chat-thread', LOCALE.REPLY_IN_THREAD, 'ph-act-thread'),
          tile('chat-action-copy', LOCALE.COPY),
          tile('chat-action-forward', LOCALE.FORWARD),
        ],
      }),
      item('attachment', LOCALE.COPY_ATTACHMENT),
      item('chat-action-reply', LOCALE.REPLY),
      item('chat-action-check', LOCALE.SELECT),
      item('chat-action-trash', LOCALE.DELETE, true),
    ],
  });
}

/** The file thread (386:56858): its header card, then the replies. */
function thread(replies) {
  return [
    Skeletons.Box.X({
      active: 0,
      className: `${C}-thread-head`,
      sys_pn: 'ph-thread-head',
      kids: [
        Skeletons.Box.X({
          active: 0,
          className: `${C}-thread-clip`,
          kids: [Skeletons.Image.Svg({ active: 0, ico: 'attachment', className: `${C}-attach-ico` })],
        }),
        Skeletons.Box.Y({
          active: 0,
          className: `${C}-thread-meta`,
          kids: [
            Skeletons.Note({ active: 0, className: `${C}-thread-file`, content: FILE }),
            Skeletons.Note({ active: 0, className: `${C}-thread-sum`, content: REPLIES_SUMMARY }),
            Skeletons.Note({ active: 0, className: `${C}-thread-open`, content: `${LOCALE.OPEN_FILE} →` }),
          ],
        }),
      ],
    }),
    ...(replies ? THREAD : THREAD.slice(0, 1)).map(bubble),
  ];
}

/**
 * @param {Object} ui the step
 * @param {Object} phone a SCREENS entry's `phone` block (screens.js)
 */
module.exports = function (ui, phone = {}) {
  switch (phone.view) {
    case 'hero':
      return frame(ui, {
        body: [ph.hero(ui, {
          title: LOCALE.CHAT_HERO_TITLE,
          desc: LOCALE.CHAT_HERO_DESC,
          cta: LOCALE.START_DISCOVERING,
          cta_service: 'next-step',
          deck: ph.swipeDeck(ui, { cards: [Skeletons.Box.Y({ active: 0, className: `${C}-hero-card`, kids: thread(true) })], dots: false }),
        })],
      });
    case 'actions':
      return frame(ui, { body: stream(true), overlay: actionSheet(ui) });
    case 'thread':
      return frame(ui, { body: thread(!!phone.replies) });
    default:
      return frame(ui, { body: stream(false) });
  }
};

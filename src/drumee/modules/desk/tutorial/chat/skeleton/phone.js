/**
 * The chat step on a phone — Figma flow "Chat" (386:55908): 386:55913 hero,
 * 386:56395 the stream, 386:56600 the message action sheet, 386:56858 /
 * 386:57195 the file thread. The conversation is the desk mock's own fixture,
 * so both layouts tell the same story; the dates and avatars are the frames'.
 *
 * `view` is stamped on the screen root (data-view) and the skin fades what each
 * frame holds back to 20% from it.
 */
const ph = require('../../skeleton/toolkit/phone');
const { TIME, FILE, REPLIES_SUMMARY, STREAM, THREAD } = require('../fixture');
const folderArt = require('media/grid/template/folder');

const C = 'tutorial-chat__ph';
const url = (m) => (m && m.default ? m.default : m);
const A = {
  hero: require('assets/tutorial/chat-phone/hero.png'),
  sarah: require('assets/tutorial/chat-phone/sarah.png'),
  emma: require('assets/tutorial/chat-phone/emma.png'),
  paperclip: require('assets/tutorial/chat-phone/paperclip.svg'),
  replies: require('assets/tutorial/chat-phone/replies.svg'),
  pdf: require('assets/tutorial/chat-phone/file-pdf.svg'),
  hash: require('assets/tutorial/chat-phone/hash.svg'),
  forward: require('assets/tutorial/chat-phone/forward.svg'),
  image: require('assets/tutorial/chat-phone/image.svg'),
  reply: require('assets/tutorial/chat-phone/reply.svg'),
  check: require('assets/tutorial/chat-phone/check-circle.svg'),
  trash: require('assets/tutorial/chat-phone/trash.svg'),
  smiley: require('assets/tutorial/chat-phone/react-smiley.svg'),
  reactions: [1, 2, 3, 4, 5].map((n) => require(`assets/tutorial/chat-phone/react-${n}.png`)),
};
// Sample data, as the fixture's: the day separators the frames draw.
const DAYS = ['August 13', 'August 14'];
const AVATAR = { 'Sarah K.': A.sarah, Emma: A.emma };

const img = (cls, src) => Skeletons.Element({
  active: 0, tagName: 'img', className: `${C}-${cls}`, attribute: { src: url(src), alt: '' },
});
const note = (cls, content) => Skeletons.Note({ active: 0, className: `${C}-${cls}`, content });

function workspace(ui) {
  const d = (ui.mget && ui.mget('subject_data')) || {};
  return {
    name: d.name || '',
    art: folderArt({
      area: d.area || _a.private,
      filetype: _a.hub,
      role: 'desk',
      widgetId: _.uniqueId('tutorial-chat-ph-'),
      isAttachment: 1,
    }),
  };
}

function day(text) {
  return Skeletons.Box.X({ active: 0, className: `${C}-day`, kids: [note('day-text', text)] });
}

/** A file on a message: the PDF tile, then name over size. */
function attachment(a) {
  return Skeletons.Box.X({
    active: 0,
    className: `${C}-file`,
    kids: [
      Skeletons.Box.X({ active: 0, className: `${C}-file-tile`, kids: [img('file-ico', A.pdf)] }),
      Skeletons.Box.Y({
        active: 0,
        className: `${C}-file-meta`,
        kids: [note('file-name', a.name), a.meta ? note('file-size', a.meta) : null].filter(Boolean),
      }),
    ],
  });
}

function bubble(msg, { tail = true } = {}) {
  const own = !!msg.own;
  const body = Skeletons.Box.Y({
    active: 0,
    className: `${C}-bubble`,
    dataset: { tail: tail ? '1' : '0' },
    attrOpt: { 'data-tail': tail ? '1' : '0' },
    kids: [
      note('text', msg.text),
      msg.attachment ? attachment(msg.attachment) : null,
    ].filter(Boolean),
  });
  const time = note('time', TIME);
  if (own) {
    return Skeletons.Box.Y({ active: 0, className: `${C}-msg ${C}-msg--own`, kids: [body, time] });
  }
  return Skeletons.Box.X({
    active: 0,
    className: `${C}-msg ${C}-msg--in`,
    kids: [
      AVATAR[msg.from] ? img('avatar', AVATAR[msg.from]) : Skeletons.Element({ active: 0, className: `${C}-avatar` }),
      Skeletons.Box.Y({
        active: 0,
        className: `${C}-in-col`,
        kids: [note('name', msg.from), body, time],
      }),
    ],
  });
}

/**
 * The stream as 386:56395 draws it: from the viewer's own reply on, a day
 * pill before it and before the next day's messages. The file message is held
 * back — the thread screens are where it appears.
 */
function stream() {
  const from = STREAM.findIndex((m) => m.own);
  const rest = STREAM.slice(from).filter((m) => m.id !== 'file-message');
  return [day(DAYS[0]), bubble(rest[0]), day(DAYS[1]), ...rest.slice(1).map((m) => bubble(m))];
}

/** The long-press sheet (386:56600): reactions, three tiles, then the list. */
function actionSheet() {
  const tile = (src, ico, label, pn) => Skeletons.Box.Y({
    active: 0,
    className: `${C}-tile`,
    dataset: { lit: pn ? '1' : '0' },
    attrOpt: { 'data-lit': pn ? '1' : '0' },
    ...(pn ? { sys_pn: pn } : {}),
    kids: [
      src ? img('tile-ico', src) : Skeletons.Image.Svg({ active: 0, ico, className: `${C}-tile-ico` }),
      note('tile-label', label),
    ],
  });
  const item = (src, label, danger) => Skeletons.Box.X({
    active: 0,
    className: `${C}-item`,
    dataset: { danger: danger ? '1' : '0' },
    attrOpt: { 'data-danger': danger ? '1' : '0' },
    kids: [img('item-ico', src), note('item-label', label)],
  });
  return Skeletons.Box.Y({
    active: 0,
    className: `${C}-act`,
    sys_pn: 'ph-act-sheet',
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${C}-reacts`,
        kids: [...A.reactions, A.smiley].map((src) => Skeletons.Box.X({
          active: 0, className: `${C}-react`, kids: [img('react-ico', src)],
        })),
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${C}-act-body`,
        kids: [
          Skeletons.Box.X({
            active: 0,
            className: `${C}-tiles`,
            kids: [
              tile(A.hash, null, LOCALE.REPLY_IN_THREAD, 'ph-act-thread'),
              tile(null, 'chat-action-copy', LOCALE.COPY),
              tile(A.forward, null, LOCALE.FORWARD),
            ],
          }),
          Skeletons.Element({ active: 0, className: `${C}-rule` }),
          item(A.image, LOCALE.COPY_ATTACHMENT),
          item(A.reply, LOCALE.REPLY),
          item(A.check, LOCALE.SELECT),
          item(A.trash, LOCALE.DELETE, true),
        ],
      }),
    ],
  });
}

/** The file thread's header card (386:56858): clip, name, replies, Open file. */
function threadHead() {
  const [count, when] = String(REPLIES_SUMMARY).split(/\s*·\s*/);
  return Skeletons.Box.X({
    active: 0,
    className: `${C}-head`,
    sys_pn: 'ph-thread-head',
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${C}-head-main`,
        kids: [
          Skeletons.Box.X({ active: 0, className: `${C}-head-clip`, kids: [img('head-clip-ico', A.paperclip)] }),
          Skeletons.Box.Y({
            active: 0,
            className: `${C}-head-meta`,
            kids: [
              note('head-file', FILE),
              Skeletons.Box.X({
                active: 0,
                className: `${C}-head-sum`,
                kids: [
                  img('head-sum-ico', A.replies),
                  note('head-count', count),
                  when ? note('head-when', when) : null,
                ].filter(Boolean),
              }),
            ],
          }),
        ],
      }),
      note('head-open', `${LOCALE.OPEN_FILE} →`),
    ],
  });
}

function thread(replies) {
  const msgs = replies ? THREAD : THREAD.slice(0, 1);
  return [
    threadHead(),
    Skeletons.Box.Y({
      active: 0,
      className: `${C}-thread`,
      kids: msgs.map((m, i) => bubble(m, { tail: i === msgs.length - 1 || !m.own })),
    }),
  ];
}

function frame(ui, view, { body, overlay = null }) {
  const ws = workspace(ui);
  return ph.screen(ui, {
    view,
    top: ph.topBar(ui, { title: ws.name, art: ws.art }),
    body,
    bottom: ph.composer(ui),
    overlay,
  });
}

/**
 * @param {Object} ui the step
 * @param {Object} phone a SCREENS entry's `phone` block (screens.js)
 */
module.exports = function (ui, phone = {}) {
  switch (phone.view) {
    case 'hero':
      return frame(ui, 'hero', {
        body: [ph.hero(ui, {
          title: LOCALE.CHAT_HERO_TITLE,
          desc: LOCALE.CHAT_HERO_DESC,
          cta: LOCALE.START_DISCOVERING,
          cta_service: 'next-step',
          // 386:56345: the thread, on a phone, on the brand gradient — the
          // frame's own picture of where the tour is going.
          deck: Skeletons.Box.Y({ active: 0, className: `${C}-hero-card`, kids: [img('hero-img', A.hero)] }),
        })],
      });
    case 'actions':
      return frame(ui, 'actions', { body: stream(), overlay: actionSheet() });
    case 'thread':
      return frame(ui, phone.replies ? 'thread-reply' : 'thread-open', { body: thread(!!phone.replies) });
    default:
      return frame(ui, 'stream', { body: stream() });
  }
};

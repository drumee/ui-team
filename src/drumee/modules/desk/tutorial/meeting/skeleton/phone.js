/**
 * The meeting step on a phone — Figma "Meet" (386:58198, 386:58622): the
 * hero, then the two previews as a swipe deck, each with its feature row
 * beneath. No arrows; the CTA opens the real scheduler as the tour ends
 * (meeting/index.js).
 *
 * Each card is the frame's own: the gradient well holding a phone showing
 * the call or the week (the frame's picture), then the lilac video-camera
 * tile, the feature's name and its line.
 */
const ph = require('../../skeleton/toolkit/phone');
const { ITEMS } = require('./items');
const folderArt = require('media/grid/template/folder');

const M = 'tutorial-meeting__ph';
const url = (m) => (m && m.default ? m.default : m);
// In ITEMS order: the instant call (386:58543), the week (386:58630).
const WELL = [
  require('assets/tutorial/meet-phone/instant.png'),
  require('assets/tutorial/meet-phone/schedule.png'),
];
const CAMERA = require('assets/tutorial/meet-phone/video-camera.svg');

const img = (cls, src) => Skeletons.Element({
  active: 0, tagName: 'img', className: `${M}-${cls}`, attribute: { src: url(src), alt: '' },
});

function card(item, i) {
  return Skeletons.Box.Y({
    active: 0,
    className: `${M}-card`,
    kids: [
      Skeletons.Box.Y({ active: 0, className: `${M}-well`, kids: [img('well-img', WELL[i])] }),
      Skeletons.Box.X({
        active: 0,
        className: `${M}-feature`,
        kids: [
          Skeletons.Box.X({ active: 0, className: `${M}-feature-ico`, kids: [img('feature-glyph', CAMERA)] }),
          Skeletons.Box.Y({
            active: 0,
            className: `${M}-feature-text`,
            kids: [
              Skeletons.Note({ active: 0, className: `${M}-feature-title`, content: item.title() }),
              Skeletons.Note({ active: 0, className: `${M}-feature-desc`, content: item.desc() }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui the step
 * @param {{index?: Number}} state the card on show
 */
module.exports = function (ui, state = {}) {
  const d = (ui.mget && ui.mget('subject_data')) || {};
  const art = folderArt({
    area: d.area || _a.private,
    filetype: _a.hub,
    role: 'desk',
    widgetId: _.uniqueId('tutorial-meeting-ph-'),
    isAttachment: 1,
  });
  return ph.screen(ui, {
    view: 'meeting',
    top: ph.topBar(ui, { title: d.name || '', art }),
    body: [ph.hero(ui, {
      title: LOCALE.MEET_HERO_TITLE,
      desc: LOCALE.MEET_HERO_DESC,
      cta: `${LOCALE.SCHEDULE_FIRST_MEETING} →`,
      cta_service: 'next-step',
      deck: ph.swipeDeck(ui, { cards: ITEMS.map(card), index: state.index, dots: true }),
    })],
    bottom: ph.tabBar(ui, 'meet'),
  });
};

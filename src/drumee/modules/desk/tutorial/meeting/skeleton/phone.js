/**
 * The meeting step on a phone — Figma "Meet" (386:58198, 386:58622): the
 * hero, then the two previews as a swipe deck, each with its feature row
 * beneath. No timer and no arrows; the CTA opens the real scheduler as the
 * tour ends (meeting/index.js).
 */
const ph = require('../../skeleton/toolkit/phone');
const { ITEMS } = require('./items');

function card(ui, item) {
  return Skeletons.Box.Y({
    active: 0,
    className: 'tutorial-meeting__ph-card',
    kids: [
      Skeletons.Box.Y({ active: 0, className: 'tutorial-meeting__ph-well', kids: [item.node(ui)] }),
      Skeletons.Box.X({
        active: 0,
        className: 'tutorial-meeting__ph-feature',
        kids: [
          Skeletons.Box.X({
            active: 0,
            className: 'tutorial-meeting__ph-feature-ico',
            kids: [Skeletons.Image.Svg({ active: 0, ico: item.ico })],
          }),
          Skeletons.Box.Y({
            active: 0,
            className: 'tutorial-meeting__ph-feature-text',
            kids: [
              Skeletons.Note({ active: 0, className: 'tutorial-meeting__ph-feature-title', content: item.title() }),
              Skeletons.Note({ active: 0, className: 'tutorial-meeting__ph-feature-desc', content: item.desc() }),
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
  const d = ui.mget && ui.mget('subject_data');
  return ph.screen(ui, {
    top: ph.topBar(ui, { title: (d && d.name) || '' }),
    body: [ph.hero(ui, {
      title: LOCALE.MEET_HERO_TITLE,
      desc: LOCALE.MEET_HERO_DESC,
      cta: `${LOCALE.SCHEDULE_FIRST_MEETING} →`,
      cta_service: 'next-step',
      deck: ph.swipeDeck(ui, { cards: ITEMS.map((i) => card(ui, i)), index: state.index, dots: true }),
    })],
    bottom: ph.tabBar(ui, 'meet'),
    fab: ph.fab(ui),
  });
};

/**
 * The task step on a phone — Figma "Task" (386:57322): the hero, then the five
 * tracker views as a swipe deck with pill dots. No timer and no arrows; the
 * CTA opens the real New task form as the tour ends (task/index.js).
 */
const ph = require('../../skeleton/toolkit/phone');
const { taskPreview } = require('./preview');
const { VIEWS } = require('./views');

function card(ui, v) {
  return Skeletons.Box.Y({
    active: 0,
    className: 'tutorial-task__ph-card',
    kids: [
      Skeletons.Box.Y({ active: 0, className: 'tutorial-task__ph-well', kids: [taskPreview(ui, v.key)] }),
      Skeletons.Note({ active: 0, className: 'tutorial-task__ph-caption', content: v.title() }),
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
      title: LOCALE.TASK_HERO_TITLE,
      desc: LOCALE.TASK_HERO_DESC,
      cta: LOCALE.CREATE_FIRST_TASK,
      cta_service: 'next-step',
      deck: ph.swipeDeck(ui, { cards: VIEWS.map((v) => card(ui, v)), index: state.index, dots: true }),
    })],
    bottom: ph.tabBar(ui, 'task'),
    fab: ph.fab(ui),
  });
};

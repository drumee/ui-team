/**
 * The task step on a phone — Figma "Task" (386:57322): the hero, then the five
 * tracker views as a swipe deck with pill dots. No timer and no arrows; the
 * CTA opens the real New task form as the tour ends (task/index.js).
 *
 * Each card is the frame's own: a white card, the gradient well holding a
 * phone showing that view (the frame's picture), and its caption.
 */
const ph = require('../../skeleton/toolkit/phone');
const { VIEWS } = require('./views');
const folderArt = require('media/grid/template/folder');

const T = 'tutorial-task__ph';
const url = (m) => (m && m.default ? m.default : m);
const WELL = {
  board: require('assets/tutorial/task-phone/board.png'),
  calendar: require('assets/tutorial/task-phone/calendar.png'),
  gantt: require('assets/tutorial/task-phone/gantt.png'),
  list: require('assets/tutorial/task-phone/list.png'),
  health: require('assets/tutorial/task-phone/health.png'),
};
const PLUS = require('assets/tutorial/task-phone/plus.svg');

function card(v) {
  return Skeletons.Box.Y({
    active: 0,
    className: `${T}-card`,
    kids: [
      Skeletons.Box.Y({
        active: 0,
        className: `${T}-well`,
        kids: [Skeletons.Element({
          active: 0, tagName: 'img', className: `${T}-well-img`, attribute: { src: url(WELL[v.key]), alt: '' },
        })],
      }),
      Skeletons.Note({ active: 0, className: `${T}-caption`, content: v.title() }),
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
    widgetId: _.uniqueId('tutorial-task-ph-'),
    isAttachment: 1,
  });
  return ph.screen(ui, {
    view: 'task',
    top: ph.topBar(ui, { title: d.name || '', art }),
    body: [ph.hero(ui, {
      title: LOCALE.TASK_HERO_TITLE,
      desc: LOCALE.TASK_HERO_DESC,
      cta: LOCALE.CREATE_FIRST_TASK,
      cta_ico: url(PLUS),
      cta_service: 'next-step',
      deck: ph.swipeDeck(ui, { cards: VIEWS.map(card), index: state.index, dots: true }),
    })],
    bottom: ph.tabBar(ui, 'task'),
  });
};

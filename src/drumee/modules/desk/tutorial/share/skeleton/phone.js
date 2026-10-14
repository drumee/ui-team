/**
 * The share step on a phone — Figma "share" (386:59700 → 386:61932): the
 * Secure Share panel as a full page under a top bar, no tab bar.
 *
 * The panel is the desk mock's own builder: the blocks the tour lights are the
 * same parts on both layouts, and the skin unboxes the panel at phone width.
 */
const ph = require('../../skeleton/toolkit/phone');
const panel = require('./panel');

/**
 * @param {Object} ui the step
 * @param {{lit: String, subject?: String, subject_data?: Object}} state
 */
module.exports = function (ui, state = {}) {
  return ph.screen(ui, {
    top: ph.topBar(ui, { title: LOCALE.SECURE_SHARE, actions: false }),
    body: [panel(ui, {
      lit: state.lit,
      subject: state.subject,
      subject_data: state.subject_data,
    })],
  });
};

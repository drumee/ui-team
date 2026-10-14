/**
 * Skip tour — the touch equivalent of Escape.
 *
 * The ✕ left the callout because desktop has Escape. Touch has no Escape, and
 * several screens draw no callout at all (the heroes), so on a touch device a
 * tour had no way out but pressing through it. Raises `end-tour`, which both
 * hosts already handle as "leave without completing": a tour recorded on
 * success stays armed. Shown by CSS only when the host stamps data-touch="1".
 *
 * @param {Object} ui the tour host
 */
module.exports = function skip(ui) {
  return Skeletons.Note({
    className: 'tutorial-skip',
    content: LOCALE.TUTORIAL_SKIP,
    service: 'end-tour',
    uiHandler: [ui],
    sys_pn: 'tour-skip',
  });
};

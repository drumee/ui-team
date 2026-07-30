const { button } = require("builtins/skeleton/toolkit");

// Right-aligned action row built with the shared button() toolkit, as in
// window/info — the previous hand-rolled Notes carried their own pill styling.
//
// Priority keeps the old semantics: the first question is the dismissive one
// (Cancel / Got it) and renders secondary; everything after it is primary. That
// matches window/info, whose default single Close button is secondary too.
//
// button() forwards `value` but not an arbitrary `choice` field, so the 1-based
// index rides on `value` and index.js's ask() reads it back from there.
module.exports = function (ui, message, questions) {
  const fig = ui.fig.family; // window-choice
  if (!questions || !questions.length) {
    questions = ui.mget("questions") || [LOCALE.CLOSE];
  }

  let i = 0;
  return Skeletons.Box.X({
    className: `${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    kids: questions.map((q) => {
      i++;
      return button(ui, {
        label: q,
        type: _a.toggle,
        className: `${fig}__button`,
        service: _a.selection,
        priority: i === 1 ? "secondary" : "primary",
        value: i,
      });
    })
  });
};

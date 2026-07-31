// Assembled like window/info's skeleton: a __header wrapper around the
// logo/close __topbar, then the message __container, then the action row.
//
// Default mode drops the old "c" flag — it selected the minimize/zoom control of
// the previous header, which the drumee-logo topbar replaces.
module.exports = function (ui, message, questions) {
  const fig = ui.fig.family; // window-choice
  const mode = ui.mget(_a.mode) || "hbf";
  const header = Skeletons.Box.X({
    className: `${fig}__header ${ui.fig.group}__header`,
    kids: [require('./topbar')(ui)]
  });
  message = message || ui.mget(_a.message);
  const m = new RegExp(`[${mode}]`);

  const a = Skeletons.Box.Y({
    className: `${fig}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: []
  });
  if (m.test('h')) {
    a.kids.push(header);
  }
  if (m.test('b')) {
    a.kids.push(require('./body')(ui, message));
  }
  if (m.test('f')) {
    a.kids.push(require('./footer')(ui, message, questions));
  }
  return a;
};

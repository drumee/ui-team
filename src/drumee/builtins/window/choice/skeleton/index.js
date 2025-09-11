module.exports = function (ui, message, questions) {
  let mode = ui.mget(_a.mode) || "hbfc";
  const pfx = `${ui.fig.group}-choice`;
  const header = Skeletons.Box.X({
    className: `${pfx}__topbar ${ui.fig.group}__topbar`,
    kids: [require('./header')(ui)]
  });
  message = message || ui.megt(_a.message)
  const m = new RegExp(`[${mode}]`);

  const a = Skeletons.Box.Y({
    className: `${pfx}__main ${ui.fig.group}__modal`,
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
;

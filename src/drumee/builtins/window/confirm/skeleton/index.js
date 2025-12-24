
const __skl_window_confirm = function (ui, content, mode) {
  if (mode == null) { mode = "hbfc"; }
  mode = ui.mget(_a.mode) || mode;
  const pfx = `${ui.fig.group}-confirm`;
  const header = Skeletons.Box.X({
    className: `${pfx}__topbar ${ui.fig.group}__topbar`,
    kids: [require('./header')(ui)]
  });

  const body = content || ui.mget(_a.body);
  if (body) {
    if (_.isFunction(body)) {
      content = body(ui);
    } else {
      content = body;
    }
  } else {
    content = require('./body')(ui);
  }

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
    if (_.isArray(content)) {
      a.kids = content;
    } else {
      a.kids.push(content);
    }
  }
  if (m.test('f')) {
    a.kids.push(require('./footer')(ui, mode));
  }

  return a;
};

module.exports = __skl_window_confirm;

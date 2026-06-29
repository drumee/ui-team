const { button} = require("builtins/skeleton/toolkit");

module.exports = function (ui) {
  let content;
  let fig = ui.fig.family;
  const mode = ui.mget(_a.mode) || "hbf";
  const header = Skeletons.Box.X({
    className: `${fig}__header ${ui.fig.group}__header`,
    kids: [require('./topbar')(ui)]
  });

  const body = ui.mget(_a.body);
  if (body) {
    if (_.isFunction(body)) {
      content = body(ui);
    } else {
      content = body;
    }
  } else {
    content = require('./message')(ui);
  }

  // const footer = Skeletons.Box.X({
  //   className: `${fig}__footer`,
  //   kids: [
  //     Skeletons.Note({
  //       className: `${fig}__button`,
  //       content: "Ok",
  //       service: _e.close
  //     })
  //   ]
  // });
  // Custom action buttons (e.g. the folder invite-sent toast) — each action
  // routes its service to its own uiHandler so a button can act on the window
  // that opened the toast rather than the toast itself. Passing the action's
  // handler as button()'s `ui` keeps the shared button styling while still
  // dispatching to that handler. Absent any actions, fall back to the standard
  // single Close button.
  const actions = ui.mget("actions");
  const footer = Skeletons.Box.X({
    className: `${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids:
      _.isArray(actions) && actions.length
        ? actions.map((a) =>
            button(a.uiHandler || ui, {
              label: a.label,
              type: _a.toggle,
              className: `${fig}__button`,
              service: a.service,
              priority: a.priority || "secondary",
              ico: a.ico,
              dataset: a.dataset,
            }),
          )
        : [
            button(ui, {
              label: LOCALE.CLOSE,
              type: _a.toggle,
              className: `${fig}__button`,
              service: _e.close,
              priority: "secondary",
            }),
          ],
  });
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
  if (m.test('bc')) {
    a.kids.push(content);
  }
  if (m.test('f')) {
    a.kids.push(footer);
  }
  return a;
};

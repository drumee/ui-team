function syncerButtons(_ui_, opt) {
  const contentFig = `${_ui_.fig.family}`;

  return Skeletons.Box.Y({
    className: `${contentFig}__command`,
    uiHandler: _ui_,
    kids: [
      Skeletons.Button.Label({
        className: `${contentFig}__checkbox`,
        ico: "account_check",
        label: LOCALE.DONT_SHOW_TIPS_AGAIN,
        state:0,
        service: "hide-tips",
        sys_pn : "hideSyncTips"
      }),
      Skeletons.Note({
        className: `button ignore window-confirm__button-secondary`,
        content: LOCALE.GOT_IT,
        service: _e.close,
        ...opt
      }),
    ]
  })
}
module.exports = syncerButtons;

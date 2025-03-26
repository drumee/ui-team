
const __results = function (_ui_) {
  const list = Skeletons.List.Smart({
    //kind         : KIND.list.stream 
    debug: __filename,
    flow: _a.y,
    radiotoggle: _a.parent,
    className: `${_ui_.fig.family}__list-results`,
    sys_pn: "roll-results",
    vendorOpt: Preset.List.Orange_e
  });

  const button = Skeletons.Box.X({
    className: `${_ui_.fig.family}__container-commands`,
    debug: __filename,
    sys_pn: "ref-actions-bar",
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__button mt-20 mb-20`,
        uiHandler: _ui_,
        service: "add-selection",
        content: LOCALE.CHOOSE
      })
    ]
  });

  const header = Skeletons.Note({
    content: LOCALE.MY_CONTACTS,
    className: `${_ui_.fig.family}__title`
  });

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__container-results`,
    sys_pn: "results-container",
    partHandler: [_ui_],
    kids: [header, list, button]
  });
  return a;
};

const __results_list = function (_ui_, state) {
  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__main`,
    sys_pn: "ref-streams",
    kids: [
      __results(_ui_)
    ]
  }, {
    height: _a.auto,
    zIndex: 10
  });
  return a;
};
module.exports = __results_list;

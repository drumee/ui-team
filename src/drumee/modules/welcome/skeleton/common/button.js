function __skl_welcome_action_button(_ui_, _service, _label = LOCALE.NEXT) {
  const buttonFig = _ui_.fig.family

  const button = Skeletons.Box.X({
    className: `${buttonFig}__row buttons-wrapper buttons no-background`,
    sys_pn: 'button-wrapper',
    service: _service,
    uiHandler: [_ui_],
    state: 0,
    haptic: 500,
    dataset: {
      error: 0,
      mode: _a.open
    },
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${buttonFig}__button-confirm`,
        content: _label,
        sys_pn: "button-confirm",
        dataset: {
          state: 0
        }
      })
    ]
  })
  return button;

}

export default __skl_welcome_action_button
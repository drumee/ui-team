function terms_and_conditions(ui) {
  const conditionsFig = `${ui.fig.family}-terms-and-conditions`


  const title = Skeletons.Box.X({
    className: `${conditionsFig}__title`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'feather',
        className: `${conditionsFig}__icon feather`,
        service: _e.close,
        uiHandler: ui
      }),

      Skeletons.Note({
        className: `${conditionsFig}__note title`,
        content: "I'm not a bot"
      })
    ]
  });

  const close = Skeletons.Box.X({
    className: `${conditionsFig}__close`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'account_cross',
        className: `${conditionsFig}__icon close account_cross`,
        service: _e.close,
        uiHandler: ui
      })
    ]
  });

  const header = Skeletons.Box.X({
    className: `${conditionsFig}__header`,
    kids: [
      title,
      close
    ]
  });

  const body = Skeletons.Box.X({
    className: `${conditionsFig}__body`,
    kids: [
      Skeletons.Box.Y({
        className: `${conditionsFig}__body-content`,
        kids: [
          Skeletons.Box.Y({
            className: `${conditionsFig}__wrapper cgu`,
            kids: [
              Skeletons.Box.X({
                className: `${conditionsFig}_buttons-wrapper`,
                kids: [
                  Preset.ConfirmButtons(ui,
                    {
                      confirmLabel: LOCALE.ACCEPT,
                      confirmService: 'accept-conditions',
                      cancelLabel: LOCALE.REFUSE,
                      cancelService: 'decline-conditions',
                      uiHandler: [ui]
                    },
                    {
                      sys_pn: 'conditions',
                    })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const content = Skeletons.Box.Y({
    className: `${conditionsFig}__content`,
    kids: [
      header,
      body
    ]
  });

  const a = Skeletons.Box.X({
    className: `${conditionsFig}__main u-jc-center u-ai-center`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${conditionsFig}__container`,
        kids: [
          content
        ]
      })
    ]
  });

  return a;
};

export default terms_and_conditions;


const __skl_window_calculator = (_ui_) => {
  const { family, group } = _ui_.fig;
  const action = require('window/skeleton/topbar/control')(_ui_, 'c');

  const content = Skeletons.Box.Y({
    className: `${family}__body`,
    uiHandler: _ui_,
    partHandler: _ui_,
    kids: [
      Skeletons.Box.X({
        className: `${family}__calc-heading`,
        uiHandler: _ui_,
        partHandler: _ui_,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-title`,
            uiHandler: _ui_,
            partHandler: _ui_,
            content: "Calculator"
          }),
          Skeletons.Note({
            className: `${family}__calc-title`,
            sys_pn: "calc-hint",
            uiHandler: _ui_,
            partHandler: _ui_,
            content: ""
          }),
          Skeletons.Note({
            className: `${family}__calc-title`,
            sys_pn: "calc-total",
            uiHandler: _ui_,
            partHandler: _ui_,
            content: ""
          }),
        ]
      }),
      Skeletons.Box.Y({
        className: `${family}__calc-input-block ${group}__calc-input-block`,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-input-ans blink`,
            sys_pn: "calc-input",
            uiHandler: _ui_,
            partHandler: _ui_,
            content: "|"
          }),
        ]
      }),
      Skeletons.Box.X({
        className: `${family}__calc-actions ${group}__calc-actions`,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            uiHandler: _ui_,
            partHandler: _ui_,
            content: "1"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "2"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "3"
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${family}__calc-actions ${group}__calc-actions`,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "4"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "5"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "6"
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${family}__calc-actions ${group}__calc-actions`,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "7"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "8"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "9"
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${family}__calc-actions__last`,
        kids: [
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate",
            content: "0"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate-sign",
            content: "+"
          }),
          Skeletons.Note({
            className: `${family}__calc-actions-btn`,
            service: "calculate-sign",
            content: "-"
          })
        ]
      })
    ]
  })

  const header = Skeletons.Box.X({
    className: `${family}__tolbar ${group}__tolbar`,
    kids: [action],
    sys_pn: _a.header
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${family}__main`,
    kids: [header, content]
  });
};

module.exports = __skl_window_calculator;
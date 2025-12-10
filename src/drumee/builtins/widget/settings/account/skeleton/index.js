const { button, menuInput, entry } = require("../../../../skeleton/toolkit");

/**
 *
 * @param {*} ui
 * @param {*} opt
 */
function nav_item(ui, ico, label) {
  let fig = ui.fig.family;
  return Skeletons.Box.X({
    className: `${fig}__item`,
    uiHandler: [ui],
    radio: `nav-${ui._id}`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${fig}__item-icon`,
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${fig}__item-text`,
        content: label,
      }),
    ],
  });
}

/**
 * 
 * @param {*} ui 
 */
function nav(ui) {
  let fig = ui.fig.family;
  const topics = Skeletons.Box.Y({
    className: `${fig}__topics`,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__title`,
        content: LOCALE.SETTINGS,
      }),
      nav_item(ui, 'profile', LOCALE.PROFILE),
      nav_item(ui, 'settings', LOCALE.PREFERENCES),
      nav_item(ui, 'storage', LOCALE.STORAGE),
      nav_item(ui, 'shield', LOCALE.SECURITY),
    ],
  });
  const legals = Skeletons.Box.Y({
    className: `${fig}__legals`,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__legals-text`,
        content: LOCALE.PRIVACY_POLICY,
      }),
      Skeletons.Note({
        className: `${ui.fig.family}__legals-text`,
        content: LOCALE.TERMS_OF_SERVICE
      }),
    ],
  });
  return [topics, legals]
}

function user(ui) {
  const fig = `${ui.fig.family}__avatar`;
  return Skeletons.Box.G({
    className: `${fig}-main`,
    kids: [
      Skeletons.UserProfile({ auto_color: 0 }),
      Skeletons.Box.Y({
        className: `${fig}-details`,
        kids: [
          Skeletons.Element({
            className: `${fig}-username item`,
            content: Visitor.fullname(),
          }),
          Skeletons.Element({
            className: `${fig}-email item`,
            content: Visitor.profile().email,
          }),
          Skeletons.Element({
            className: `${fig}-change item`,
            content: LOCALE.CHANGE_AVATAR
          }),
        ]
      })
    ]
  });
}

function form(ui) {
  const fig = `${ui.fig.family}__form`;
  return Skeletons.Box.Y({
    className: `${fig}-main`,
    kids: [
      Skeletons.Box.G({
        className: `${fig}-row name`,
        kids: [
          entry(ui, {
            label: LOCALE.FIRSTNAME,
            name: _a.firstname,
            placeholder: "",
            value: Visitor.profile().firstname
          }),
          entry(ui, {
            label: LOCALE.LASTNAME,
            name: _a.lastname,
            placeholder: "",
            value: Visitor.profile().lastname,
          })
        ]
      }),
      Skeletons.Box.G({
        className: `${fig}-row`,
        kids: [
          entry(ui, {
            label: LOCALE.EMAIL,
            name: _a.email,
            value: Visitor.profile().email,
            placeholder: "i@example.org"
          }),
          Skeletons.Box.G({
            className: `${ui.fig.family}__entry-main`,
            kids: [
              Skeletons.Note({
                className: `${ui.fig.family}__entry-label country`,
                content: LOCALE.COUNTRY,
              }),
              menuInput(ui, {
                name: 'country_code',
                service: "select-country",
                refAttribute: 'locale_name',
                placeholder: 'Select a country',
                value: "",
              }),
            ]
          })
        ]
      }),
    ]
  })

  // return Skeletons.Box.G({
  //   className: `${fig}-main`,
  //   kids: [
  //     entry(ui, {
  //       name: _a.firstname,
  //       value: Visitor.profile().firstname
  //     }),
  //     entry(ui, {
  //       name: _a.lasstname,
  //       value: Visitor.profile().lastname
  //     }),
  //     Skeletons.Box.X({
  //       className: `${fig}-field`,
  //       kids: [
  //         Skeletons.Element({
  //           className: `${fig}-email item`,
  //           content: LOCALE.FIRSTNAME,
  //         }),
  //         entry(ui,{
  //           name:_a.firstname,
  //           value:Visitor.profile().firstname
  //         }),
  //       ]
  //     }),
  //     Skeletons.Box.X({
  //       className: `${fig}-field`,
  //       kids: [
  //         Skeletons.Element({
  //           className: `${fig}-username item`,
  //           content: LOCALE.LASTNAME,
  //         }),
  //         entry(ui, {
  //           name: _a.lasstname,
  //           value: Visitor.profile().lasstname
  //         }),
  //       ]
  //     })
  //   ]
  // });
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function settings_body(ui) {
  const fig = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${fig}__header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        sys_pn: "tab-name",
        content: LOCALE.PROFILE,
      }),
      Skeletons.Button.Svg({
        ico: _a.cross,
        className: `${ui.fig.group}__icon close`,
        service: _e.close,
        uiHandler: [ui]
      })
    ],
  });

  const widget = Skeletons.Box.Y({
    className: `${fig}__content`,
    uiHandler: ui,
    sys_pn: _a.content,
    kids: [
      user(ui),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      form(ui)
    ],
  });


  const group = ui.fig.group;
  const buttons = Skeletons.Box.X({
    className: `${group}__buttons`,
    uiHandler: ui,
    kids: [
      button(ui, {
        label: LOCALE.APPLY_ALL_AND_SAVE,
        type: _a.toggle,
        className: `${group}__button`,
        service: _e.close,
        priority: "primary",
      }),
    ],
  });
  return Skeletons.Box.G({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__nav`,
        kids: nav(ui),
      }),
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [header, widget, buttons],
      }),
    ],
  });
}

export default settings_body;

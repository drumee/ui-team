/* ================================================================== *
 * Copyright Xialia.com  2011-2022
 * FILE : src/drumee/builtins/window/hub/sharebox/skeleton/options_list.js
 * TYPE : Skeleton
 * ===================================================================**/
function __skl_valid_until (_ui_) {
  const validityFig = `${_ui_.fig.family}-validity`;

  const switchContainer = Skeletons.Box.X({
    className : `${validityFig}__switch-container`,
    sys_pn    : 'switch-container-wrapper',
    kids      : [
      Skeletons.Switch({
        className   : `${validityFig}__switch-wrapper`,
        sys_pn      : 'validity-switch',
        service     : 'toggle-validity-mode',
        uiHandler   : _ui_,
        state       : 1,
        values      : [_a.limited, _a.infinity],
        vendorOpt   : [
          {label: LOCALE.SET_VALIDITY},
          {label: LOCALE.UNLIMITED}
        ]
      })
    ]
  })

  let days = Skeletons.EntryBox({
    className     : `${validityFig}__entry validity-entry days`,
    uiHandler     : _ui_,
    placeholder   : 'dd',
    service       : '',
    type          : 'number',
    sys_pn        : 'month-setting-input',
    autocomplete  : _a.off,
    value         : '',
    name          : LOCALE.DAYS,
    formItem      : 'days'
  })

  let hours = Skeletons.EntryBox({
    className     : `${validityFig}__entry validity-entry hours`,
    uiHandler     : _ui_,
    service       : '',
    placeholder   : 'hh',
    type          : _a.number,
    sys_pn        : 'month-setting-input',
    autocomplete  : _a.off,
    value         : '',
    name          : LOCALE.HOURS,
    formItem      : 'hours',
    min           : '0',
    max           :23,
  })

  const setValidityWrapper = Skeletons.Box.X({
    className : `${validityFig}__set-validity`,
    sys_pn    : 'set-validity-wrapper',
    dataset   : {
      mode  : _a.closed
    },
    kids      : [
      Skeletons.Box.X ({
        className  : `${validityFig}__validity-action-wrapper`,
        kids: [
          days,
          Skeletons.Note({
            className  : `${validityFig}__days-caption`,
            content: LOCALE.DAYS
          }),
          hours,
          Skeletons.Note({
            className  : `${validityFig}__hours-caption`,
            content: LOCALE.HOURS
          })
        ]
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${validityFig}__validity-wrapper`,
    kids: [
      Skeletons.Note({
        className   : `${validityFig}__note title`,
        content     : LOCALE.VALIDITY
      }),
      switchContainer,
      setValidityWrapper
    ]
  })

  return a;
}
export default __skl_valid_until;
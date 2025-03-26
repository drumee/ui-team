/* ================================================================== *
 * Copyright Xialia.com  2011-2022
 * FILE : src/drumee/builtins/window/hub/sharebox/skeleton/options_list.js
 * TYPE : Skeleton
 * ===================================================================**/
function __skl_valid_until (_ui_, mode = _a.view, type = null) {
  const validityFig = `${_ui_.fig.family}-validity`;

  let _validitySwitchState = 0;
  let _validityMode = _a.open;
  if ((_ui_.data.dmz_expiry == _a.infinity) && (type != 'toggle-edit')) {
    _validitySwitchState = 1;
    _validityMode = _a.closed;
  }

  const switchContainer = Skeletons.Box.X({
    className : `${validityFig}__switch-container`,
    sys_pn    : 'switch-container-wrapper',
    kids      : [
      Skeletons.Switch({
        className   : `${validityFig}__switch-wrapper`,
        sys_pn      : 'validity-switch',
        service     : 'toggle-validity-mode',
        uiHandler   : _ui_,
        state       : _validitySwitchState,
        values      : [_a.limited, _a.infinity],
        vendorOpt   : [
          {label: LOCALE.SET_VALIDITY},
          {label: LOCALE.UNLIMITED}
        ]
      })
    ]
  })


  let action = null;
  let days = null;
  let hours = null;

  if(mode == _a.edit) {
    action = Skeletons.Note({
      className   : `${validityFig}__note btn-ok`,
      service      : 'save-validity',
      content     : "Ok"
    })

    days = Skeletons.EntryBox({
      className     : `${validityFig}__entry validity-entry days`,
      uiHandler     : _ui_,
      placeholder   : 'dd',
      service       : '',
      type          : _a.number,
      sys_pn        : 'month-setting-input',
      autocomplete  : _a.off,
      value         : _ui_.formData.days || '',
      name          : 'days',
      formItem      : 'days',
      min           : 0,
      max           : 999,
    })
  
    hours = Skeletons.EntryBox({
      className     : `${validityFig}__entry validity-entry hours`,
      uiHandler     : _ui_,
      service       : '',
      placeholder   : 'hh',
      type          : _a.number,
      sys_pn        : 'hours-setting-input',
      autocomplete  : _a.off,
      value         : _ui_.formData.hours || '',
      name          : 'hours',
      formItem      : 'hours',
      min           : 0,
      max           : 23,
    })
  }

  if(mode == _a.view){
    action = Skeletons.Button.Svg({
      ico         : "desktop_sharebox_edit",
      service     : 'edit-validity',
      className   : `${validityFig}__icon edit-icon`,
    })

    days = Skeletons.Note({
      className : `${validityFig}__note validity-entry-text`,
      content   : _ui_.formData.days || '0'
    })
    
    hours = Skeletons.Note({
      className : `${validityFig}__note validity-entry-text`,
      content   : _ui_.formData.hours || '0'
    })
  }

  let validityIcon;
  if (_ui_.data.dmz_expiry == _a.expired) {
    validityIcon = Skeletons.Box.X({
      className : `${validityFig}__expiry-time-wrapper expiry-status-icon`,
      kids      : [
        Skeletons.Button.Svg({
          ico       : 'raw-clock',
          className : `${validityFig}__icon expiry-time`,
          tooltips  : {
            content   : LOCALE.SHAREBOX_VALIDITY_EXPIRE
          }
        })
      ]
    });
  }

  const setValidityWrapper = Skeletons.Box.X({
    className : `${validityFig}__set-validity`,
    sys_pn    : 'set-validity-wrapper',
    dataset   : {
      mode  : _validityMode
    },
    kids      : [
      Skeletons.Box.X({
        className : `${validityFig}__validity-action-wrapper ${mode}`,
        kids      : [
          days,
          Skeletons.Note({
            className  : `${validityFig}__days-caption`,
            content: LOCALE.DAYS
          }),

          hours,
          Skeletons.Note({
            className  : `${validityFig}__hours-caption`,
            content: LOCALE.HOURS
          }),

          action
        ]
      }),

      validityIcon
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${validityFig}__validity-wrapper`,
    kids: [
      switchContainer,
      setValidityWrapper
    ]
  })

  return a;
}

export default __skl_valid_until;
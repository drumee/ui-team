// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/wm/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

function _icons_list (_ui_) {
  const a = Skeletons.List.Smart({
    className     : `${_ui_.fig.family}__icons-list icons-list desk-content`,
    innerClass    : `${_ui_.fig.family}__icons-scroll`,
    sys_pn        : _a.list,
    flow          : _a.y,
    bubble        : 1,
    timer        : 1000,
    vendorOpt     : Preset.List.Orange_e,
    itemsOpt      : {
      kind      : 'media',
      role      : 'dmz',
      token     : _ui_.mget(_a.token),
      signal    : _e.ui.event,
      service   : 'open-node',
      uiHandler : [_ui_],
      on_start  : 'open-node'
    },
    api           : _ui_.mget(_a.api)
  });

  return a;

};

// ======================================================
// Desk content _ui_
// ======================================================

function _desk_content (_ui_) {
  const a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__main`,
    sys_pn      : 'window-wrapper',
    debug       : __filename,
    styleOpt    : {
      height  : _K.size.full
    },
    kids        : [
      _icons_list(_ui_),
      { kind : 'selection', sys_pn:'ref-selection' },

      Skeletons.FileSelector({
        partHandler : _ui_
      }),
      
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__windows-layer`,
        sys_pn    : 'windows-layer'
      }),

      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__wrapper`,
        name      : 'tooltips'
      }),

      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__wrapper-modal`,
        name      : 'modal'
      })
    ]
  });

  return a;
};

export default _desk_content;

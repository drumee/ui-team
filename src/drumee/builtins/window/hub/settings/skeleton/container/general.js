// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/#{_ui_.prefix}/settings
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __hub_settings_general
//
// @param [Object] _ui_
//
// @return [Object] 
//
// ===========================================================
const CHANNEL = _.uniqueId();

const _field = function(_ui_, kind){
  const cn = _ui_.fig.family + '__field';
  const a = { 
    kind,
    hub       : _ui_,
    flow      : _a.x,
    radio     : CHANNEL,
    fig       : {
      field   : cn
    },
    className : cn
  };
  return a; 
};

//------------------------------------
//
//------------------------------------
const __hub_settings_general = function(_ui_) {
  const invitation = { 
    kind      : 'invitation',
    signal    : _e.ui.event,
    handler   : {
      uiHandler   : this
    }
  };

  const a = Skeletons.Box.Y({
    debug     : __filename, 
    className : `${_ui_.fig.family}__container-general`,
    kids: [
      _field(_ui_, 'hub_name'),
      _field(_ui_, 'hub_permission'),
      _field(_ui_, 'hub_owner'),
      _field(_ui_, 'hub_administrator'),
      invitation
    ]
  });
  return a;
};
module.exports = __hub_settings_general;

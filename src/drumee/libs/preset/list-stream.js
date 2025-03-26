/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/configs/list-stream
//   TYPE : configs
// ==================================================================== *
const CN = "share-popup__modal-close";
const __desk_conf = {
  Indigo  : {
    // disableFadeOut: true
    alwaysVisible : true,
    //railVisible   : true
    size       : "2px",
    opacity    : "1",
    color      : "#879bff",
    distance   : "2px"
  },
    //railColor  : _a.transparent #"#E5E5E5"
  Orange_e   : {
    // disableFadeOut: true
    alwaysVisible : true,
    //railVisible   : true
    size       : "2px",
    opacity    : "1",
    color      : "rgb(250, 133, 64)", //_a.transparent #"#FA8540"
    distance   : "1px"
  },
    //railColor  : _a.transparent #"#E5E5E5"
  Orange_d   : {
    alwaysVisible : true,
    //railVisible   : true
    size       : "7px",
    opacity    : "1",
    color      : "#DDE2E8", //"#FA8540"
    distance   : "1px"
  },
    //railColor  : _a.transparent #"#DDE2E8"

  y0_26_104    : {
    min        : 26,
    max        : 104,
    unit       : 26
  },
  y30_36_120   : {
    min        : 30,
    max        : 144,
    unit       : 36
  },
  y30_36_180   : {
    min        : 36,
    max        : 180,
    unit       : 36
  },
  y36_36_216   : {
    min        : 36,
    max        : 216,
    unit       : 36
  },

  Button       : {
    Close(_ui_, cn){
      if (cn == null) { cn = CN; }
      return Skeletons.Button.Icon({
          ico       : "account_cross",
          className : cn, //"share-popup__modal-close",
          service   : _e.close,
          uiHandler : _ui_
        }, {
          width: 36,
          height: 36,
          padding: 12
        });
    }
  }
};
module.exports = __desk_conf;

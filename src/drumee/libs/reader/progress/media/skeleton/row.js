// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const __progress_row = function(_ui_, header, size) {
  const a = Skeletons.Box.X({
    uiHandler     : _ui_,
    className : `${_ui_.fig.family}__main`,
    kids:[
      Skeletons.Box.X({
        uiHandler     : _ui_,
        className : `${_ui_.fig.family}__container-name`,
        kids      : [
          Skeletons.Button.Svg({
            ico       : "cross",
            className : `${_ui_.fig.family}__close close`,
            service   : _e.cancel,
            uiHandler     : _ui_,
            dataset   : {
              cancelable   : `${_ui_.mget('cancelable')}`
            }
          }),
          Skeletons.Note({
            className : `${_ui_.fig.family}__value-filename`,
            sys_pn    : "ref-filename",
            content   : "xxx.doc",
            uiHandler     : _ui_,
            dataset   : {
              visible : `${_ui_.mget('nameVisible')}`
            }
          })
        ]
      }),
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__container-progress`,
        uiHandler     : _ui_,
        kids      : [
          Skeletons.Box.X({
            className : `${_ui_.fig.family}__bar`,
            sys_pn    : "ref-chart"
          }),
          Skeletons.Note({
            className : `${_ui_.fig.family}__bar-percent`,
            sys_pn    : "ref-percent",
            content   : "0%"
          })
        ]
      }),
      Skeletons.Box.X({
        uiHandler     : _ui_,
        className : `${_ui_.fig.family}__container-size`,
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__value-filesize`,
            sys_pn    : "ref-filesize",
            content   : "0Mb",
            uiHandler     : _ui_
          })
        ]
      })
    ]
  });
  
  return a;
};
module.exports = __progress_row;

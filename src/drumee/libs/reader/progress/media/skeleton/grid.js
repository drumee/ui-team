// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const __progress_grid = function(_ui_, header, size) {
  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    kids:[
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__container-header mt-6`,
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__value-filesize ml-6`,
            sys_pn    : "ref-filesize",
            content   : _ui_.mget(_a.size) || "0Mb"
          }),
          Skeletons.Note({
            className : `${_ui_.fig.family}__value-percent mr-6`,
            sys_pn    : "ref-percent",
            content   : "0%"
          })
        ]
      }),
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__container-body`,
        kids      : [
          Skeletons.Box.X({
            className : `${_ui_.fig.family}__chart`,
            sys_pn    : "ref-chart"
          }),
          Skeletons.Button.Svg({
            ico       : "cross",
            className : `${_ui_.fig.family}__close close`,
            service   : _e.cancel,
            dataset   : {
              cancelable   : `${_ui_.mget('cancelable')}`
            }
          })
        ]
      }),
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__container-footer mb-4`,
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__value-filename`,
            sys_pn    : "ref-filename",
            content   : _ui_.mget(_a.filename) || "xxx.doc",
            dataset   : {
              visible : `${_ui_.mget('nameVisible')}`
            }
          })
        ]
      })
    ]
  });
  
  return a;
};
module.exports = __progress_grid;

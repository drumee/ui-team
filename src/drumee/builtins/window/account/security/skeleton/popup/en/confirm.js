// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __privacy_confirm = function(_ui_, title, txt){
  title = `\
Stop surveillance\
`;
  txt = `\
You want to stop connection surveillance. Your connection history will be deleted.\
`;

  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.family}__popup-confirm main`,
    debug :  __filename,
    kids      : [
      Preset.Button.Close(_ui_, "close-popup"),
      Skeletons.Note(title , `${_ui_.fig.family}__popup-confirm title`),
      Skeletons.Note(txt , `${_ui_.fig.family}__popup-confirm text`),
      Skeletons.Box.X({
        justify:_a.center,
        className:`${_ui_.fig.family}__popup-confirm__buttons`,
        kids:[
          Skeletons.Note({
            className :'btn btn--regular mr-20',
            content   : LOCALE.CANCEL,
            service   : "close-dialog",
            uiHandler     : _ui_
          }),

          Skeletons.Note({
            className :'btn btn--warning ml-20',
            content   : LOCALE.DELETE,
            service   : "confirm:remove",
            uiHandler     : _ui_
          })
        ]
      })
    ]});

  a.kids.plug(_a.debug, __filename);
  return a;
};

module.exports = __privacy_confirm;

// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : //src/drumee/builtins/window/downloader/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

//
// ===========================================================
const __desk_confirm_download = function(_ui_) {
  const pfx = `${_ui_.fig.family}`;

  const a = Skeletons.Box.Y({
    className : `${pfx}__main`, 
    kids      : [
      Preset.Button.Close(_ui_),

      Skeletons.Box.Y({
        className : `${pfx}__labels`, 
        kids      : [
          Skeletons.Note({ 
            className : 'line one',
            sys_pn    : 'filesize',
            content   : LOCALE.PREPARING
          }), //TOTAL_SIZE_OF_FILES.format('')
          
          Skeletons.Note({ 
            className : 'line two',
            content   : LOCALE.THIS_MAY_TAKE_A_WHILE
          }),
          
          Skeletons.Note({ 
            className : 'line three',
            sys_pn    : 'method',
            content   : LOCALE.DOWNLOAD_METHOD
          })
        ]}),
      
      Skeletons.Wrapper.Y({
        className : `${pfx}__wrapper`,
        name      : 'status'
      }),
      
      Skeletons.Box.X({
        className : `${pfx}__buttons`,
        sys_pn    : 'body',
        kids      : [
          Skeletons.Note({
            service   : 'download-files',
            content   : LOCALE.MULTIPLE_FILES,
            className : 'button submit'
          }),

          Skeletons.Note({
            service   : 'prepare-zip',
            content   : LOCALE.SINGLE_FILE,
            className : 'button submit'
          }),

          Skeletons.Note({
            service   : _e.close,
            content   : LOCALE.CANCEL,
            className : 'button cancel'
          })
        ]})
    ]});

  return a;
};

module.exports = __desk_confirm_download;

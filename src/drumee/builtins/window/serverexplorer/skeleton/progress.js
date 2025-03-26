// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/skeleton/progress.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_window_serverexplorer_progress = function(_ui_, data) {
  const progressFig = `${_ui_.fig.family}-progress`;

  const size = 100;

  const header = Skeletons.Box.Y({
    className : `${progressFig}__header`,
    kids    : [
      // Preset.Button.Close(_ui_, 'ie-hide-progress')
      Skeletons.Button.Svg({
        ico       : 'cross',
        className : `${progressFig}__icon close`,
        service   : 'hide-progress',
        transactionId: _ui_._transactionId,
        uiHandler : [_ui_]}),

      Skeletons.Note({ 
        className : `${progressFig}__note title`,
        sys_pn    : 'btn-status',
        content   : LOCALE.IN_PROGRESS
      })
    ]});

  const progress = { 
    kind        : 'progress_bar',
    className   : `${progressFig}__bar`,
    sys_pn      : 'progress',
    label       : (size.printf(LOCALE.BACKUP_TIPS)),
    total       : `${size}%`,
    autoDestroy : _a.no,
    transactionId: _ui_._transactionId,
    uiHandler   : [_ui_],
    partHandler : _ui_
  };

  const buttons = Skeletons.Box.X({
    className : `${progressFig}__buttons`,
    kids      : [
      // Skeletons.Note
        // className : "#{progressFig}__button-cancel button"
        // service   : 'abort-download'
        // content   : LOCALE.CANCEL
        // sys_pn    : "btn-cancel"
      Skeletons.Note({
        className : `${progressFig}__button-close button`,
        sys_pn    : 'btn-action',
        service   : 'hide-progress',
        transactionId: _ui_._transactionId,
        uiHandler : [_ui_],
        content   : LOCALE.CLOSE
      })
    ]});
  
  const a = Skeletons.Box.Y({
    className : `${progressFig}__main`,
    debug     : __filename,
    sys_pn    : 'sprogress',
    uiHandler : [_ui_],
    partHandler : _ui_,
    transactionId: _ui_._transactionId,
    kids      : [ header, progress, buttons ]});


  return a; 
};

module.exports = __skl_window_serverexplorer_progress;

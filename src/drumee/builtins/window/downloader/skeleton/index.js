// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : //src/drumee/builtins/window/downloader/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

// Confirm-download card. Compact layout: a header row (download badge, the size
// line + hint, close), the question, two option tiles side by side
// (Multiple files / Single file .zip) and a quiet Cancel. Shares __head /
// __badge / __close with the in-progress view (skeleton/progress.js) so the two
// steps read as one card.
//
// Preserved contracts: the size line keeps sys_pn 'filesize' (onDomRefresh
// swaps PREPARING → the real total), the question keeps 'method', the actions
// box keeps 'body', and the services stay 'download-files' / 'prepare-zip' /
// close.
const __desk_confirm_download = function(_ui_) {
  const pfx = `${_ui_.fig.family}`;

  // Icon over label: a Box.Y, since a Box.X's flow (data-flow) outranks a
  // one-class flex-direction in the skin.
  const option = (service, ico, label) =>
    Skeletons.Box.Y({
      className : `${pfx}__option`,
      service,
      uiHandler : [_ui_],
      // Interaction lives on the tile; its kids are inert so a press on the
      // icon or the label resolves to the tile.
      kidsOpt   : { active: 0 },
      kids      : [
        Skeletons.Image.Svg({ ico, className: `${pfx}__option-icon` }),
        Skeletons.Note({ className: `${pfx}__option-label`, content: label })
      ]});

  const a = Skeletons.Box.Y({
    debug     : __filename,
    // __main = shared base (also the progress view); __confirm scopes this
    // step's layout.
    className : `${pfx}__main ${pfx}__confirm`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__head`,
        kids      : [
          Skeletons.Box.X({
            className : `${pfx}__badge`,
            kids      : [
              Skeletons.Image.Svg({
                ico       : 'dl-download-simple',
                className : `${pfx}__badge-icon`
              })
            ]}),

          Skeletons.Box.Y({
            className : `${pfx}__head-text`,
            kids      : [
              Skeletons.Note({
                className : `${pfx}__title`,
                sys_pn    : 'filesize',
                content   : LOCALE.PREPARING
              }),
              Skeletons.Note({
                className : `${pfx}__subtitle`,
                content   : LOCALE.THIS_MAY_TAKE_A_WHILE
              })
            ]}),

          Skeletons.Button.Svg({
            className : `${pfx}__close`,
            ico       : 'cross',
            service   : _e.close,
            uiHandler : [_ui_]
          })
        ]}),

      Skeletons.Note({
        className : `${pfx}__question`,
        sys_pn    : 'method',
        content   : LOCALE.DOWNLOAD_METHOD
      }),

      Skeletons.Box.Y({
        className : `${pfx}__actions`,
        sys_pn    : 'body',
        kids      : [
          Skeletons.Box.X({
            className : `${pfx}__options`,
            kids      : [
              option('download-files', 'dl-file', LOCALE.MULTIPLE_FILES),
              option('prepare-zip', 'dl-folder', LOCALE.SINGLE_FILE)
            ]}),

          Skeletons.Box.X({
            className : `${pfx}__footer`,
            kids      : [
              Skeletons.Note({
                service   : _e.close,
                uiHandler : [_ui_],
                content   : LOCALE.CANCEL,
                className : `${pfx}__btn ${pfx}__btn--ghost`
              })
            ]})
        ]})
    ]});

  return a;
};

module.exports = __desk_confirm_download;

// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : //src/drumee/builtins/window/downloader/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

//
// ===========================================================
// Confirm-download modal (Figma 2914:186797): brand download badge, the size
// hint, "How do you want to download?", then two primary action buttons side by
// side (Multiple files / Single file .zip) with a full-width Cancel beneath.
// Uses confirm-only class names (__badge / __prompt / __actions) so it never
// collides with the download-in-progress view (skeleton/progress.js), which
// keeps reusing __labels / __buttons / __header. Preserved contracts: the size
// line keeps sys_pn 'filesize' (onDomRefresh swaps PREPARING → real total) and
// the button services stay 'download-files' / 'prepare-zip' / close.
const __desk_confirm_download = function(_ui_) {
  const pfx = `${_ui_.fig.family}`;

  const a = Skeletons.Box.Y({
    debug     : __filename,
    // __main = shared base (also used by the progress view); __confirm scopes
    // the modal layout so it never touches skeleton/progress.js.
    className : `${pfx}__main ${pfx}__confirm`,
    kids      : [
      // Figma has no close glyph — Cancel dismisses the modal.

      // Brand download badge — 56px circle, 10% brand fill (Figma 2914:206117).
      Skeletons.Box.X({
        className : `${pfx}__badge`,
        kids      : [
          Skeletons.Image.Svg({
            ico       : 'dl-download-simple',
            className : `${pfx}__badge-icon`
          })
        ]}),

      // Size hint + question.
      Skeletons.Box.Y({
        className : `${pfx}__prompt`,
        kids      : [
          Skeletons.Note({
            className : `${pfx}__prompt-size`,
            sys_pn    : 'filesize',
            content   : LOCALE.PREPARING
          }),

          Skeletons.Note({
            className : `${pfx}__prompt-hint`,
            content   : LOCALE.THIS_MAY_TAKE_A_WHILE
          }),

          Skeletons.Note({
            className : `${pfx}__prompt-method`,
            sys_pn    : 'method',
            content   : LOCALE.DOWNLOAD_METHOD
          })
        ]}),

      // Actions: two primary buttons in a row, Cancel full-width below.
      Skeletons.Box.Y({
        className : `${pfx}__actions`,
        sys_pn    : 'body',
        kids      : [
          Skeletons.Box.X({
            className : `${pfx}__actions-row`,
            kids      : [
              // Icon BESIDE the label (Figma: horizontal), so build the button
              // as a Box.X rather than Button.Label (which stacks icon/label).
              Skeletons.Box.X({
                className : `${pfx}__action`,
                service   : 'download-files',
                uiHandler : [_ui_],
                kids      : [
                  Skeletons.Image.Svg({ ico: 'dl-file', className: `${pfx}__action-icon` }),
                  Skeletons.Note({ className: `${pfx}__action-label`, content: LOCALE.MULTIPLE_FILES })
                ]}),

              Skeletons.Box.X({
                className : `${pfx}__action`,
                service   : 'prepare-zip',
                uiHandler : [_ui_],
                kids      : [
                  Skeletons.Image.Svg({ ico: 'dl-folder', className: `${pfx}__action-icon` }),
                  Skeletons.Note({ className: `${pfx}__action-label`, content: LOCALE.SINGLE_FILE })
                ]})
            ]}),

          Skeletons.Note({
            service   : _e.close,
            content   : LOCALE.CANCEL,
            className : `${pfx}__cancel`
          })
        ]})
    ]});

  return a;
};

module.exports = __desk_confirm_download;

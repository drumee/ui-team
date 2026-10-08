// The running-download frame, shared by the multiple-files step
// (skeleton/files.js) and the .zip step (skeleton/progress.js). Built after the
// upload window (window/upload-progress: skeleton/header.js, content.js,
// footer.js) so the two floaters read as one family: a pinned header — 32px
// icon, title, collapse, close — a scrolling body, and a footer with a status
// line on the left and the action on the right.
//
// The footer carries BOTH actions; the skin shows one off the frame's
// data-state: "Cancel all" while running, "Close" once done or failed — the
// way upload swaps cancel-all for close. No Hide: the header × cancels a
// running download (as upload's × does) and simply closes a finished one
// (index.js dismiss), and collapse is how the card is put out of the way.
//
// Class names are this frame's own (__header, __heading, __bottom…), not the
// confirm step's (__head, __title, __footer), so the two steps' rules never
// meet.
//
// @param {*} ui the downloader
// @param {Object} o
// @param {Object} o.title  skeleton of the header title (given a __heading class
//   here) — files.js uses an Element it repaints, progress.js the 'btn-status'
//   Note the controller sets
// @param {Array}  o.body   kids of the scrolling body
// @param {Object} o.cancel { service, sys_pn, content } for "Cancel all"
// @param {Object} o.done   { sys_pn } for "Close"
// @param {String} o.text   left of the footer (upload carries its ETA there)
// @param {String} o.cls    extra class on the frame (__files / __zip)
module.exports = function frame(ui, o) {
  const pfx = ui.fig.family;

  const header = Skeletons.Box.X({
    className : `${pfx}__header`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__header-left`,
        kids      : [
          Skeletons.Box.X({
            className : `${pfx}__icon`,
            kids      : [
              Skeletons.Button.Svg({
                className : `${pfx}__icon-svg`,
                ico       : 'dl-download-simple',
                active    : 0
              })
            ]}),
          o.title
        ]}),
      Skeletons.Box.X({
        className : `${pfx}__header-actions`,
        kids      : [
          // Wrapped in a Box, as upload does: the service lives on the box and
          // the bare icon inside is inert.
          Skeletons.Box.X({
            className : `${pfx}__collapse-wrapper`,
            service   : 'toggle-expand',
            uiHandler : [ui],
            kids      : [
              Skeletons.Button.Svg({
                className : `${pfx}__collapse`,
                ico       : 'arrow--pages',
                active    : 0
              })
            ]}),
          Skeletons.Box.X({
            className : `${pfx}__close-wrapper`,
            service   : 'dismiss',
            uiHandler : [ui],
            kids      : [
              Skeletons.Button.Svg({
                className : `${pfx}__close-btn`,
                ico       : 'cross',
                active    : 0
              })
            ]})
        ]})
    ]});

  const bottom = Skeletons.Box.X({
    className : `${pfx}__bottom`,
    kids      : [
      Skeletons.Element({ className: `${pfx}__bottom-text`, content: o.text || '' }),
      Skeletons.Box.X({ className: `${pfx}__bottom-spacer`, kids: [] }),
      Skeletons.Note({
        className : `${pfx}__cancel-all`,
        uiHandler : [ui],
        ...o.cancel
      }),
      Skeletons.Note({
        className : `${pfx}__done`,
        service   : _e.close,
        uiHandler : [ui],
        content   : LOCALE.CLOSE,
        ...o.done
      })
    ]});

  return Skeletons.Box.Y({
    debug     : __filename,
    className : `${pfx}__main ${pfx}__panel ${o.cls || ''}`,
    dataset   : { state: 'running' },
    kids      : [
      header,
      Skeletons.Box.Y({ className: `${pfx}__body`, kids: o.body }),
      bottom
    ]});
};

/**
 * "Some files are still uploading" — a banner the upload-progress window shows
 * above its own list while a form waits on those uploads. The slot is always
 * mounted (empty) so _renderWarning can feed it; build() returns its kids.
 */
function warning(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__warning`,
    sys_pn: "warning",
    kids: [],
  });
}

/**
 * @param {*} ui the upload-progress window
 * @param {{copy: object}} model from warning-model.js
 */
warning.build = function build(ui, { copy }) {
  const pfx = ui.fig.family;
  // A banner over the upload list: the files themselves are the rows below it.
  return [
    // Closing the banner is "keep uploading", never "drop the files".
    Skeletons.Box.X({
      className: `${pfx}__warning-close`,
      service: "warning-keep",
      uiHandler: [ui],
      kids: [Skeletons.Button.Svg({ className: `${pfx}__warning-close-ico`, ico: "cross", active: 0 })],
    }),
    Skeletons.Box.X({
      className: `${pfx}__warning-head`,
      kids: [
        Skeletons.Button.Svg({ className: `${pfx}__warning-icon`, ico: "apps-warning", active: 0 }),
        Skeletons.Note({ className: `${pfx}__warning-title`, content: copy.title }),
      ],
    }),
    Skeletons.Note({ className: `${pfx}__warning-body`, content: copy.body }),
    Skeletons.Box.X({
      className: `${pfx}__warning-actions`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__warning-keep`,
          content: copy.keep,
          service: "warning-keep",
          uiHandler: [ui],
        }),
        Skeletons.Note({
          className: `${pfx}__warning-skip`,
          content: copy.skip,
          service: "warning-skip",
          uiHandler: [ui],
        }),
      ],
    }),
  ];
};

module.exports = warning;

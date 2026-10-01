/**
 * "Some files are still uploading" — the upload-progress window's warning
 * phase. The slot is always mounted (empty) so _renderWarning can feed it;
 * build() returns the card's kids for that feed.
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
 * @param {{copy: object, rows: Array}} model from warning-model.js
 */
warning.build = function build(ui, { copy, rows }) {
  const pfx = ui.fig.family;
  const row = (r) =>
    Skeletons.Box.X({
      className: `${pfx}__warning-row`,
      dataset: { id: r.id, state: r.state },
      kids: [
        Skeletons.Note({ className: `${pfx}__warning-ext`, content: r.ext }),
        Skeletons.Box.Y({
          className: `${pfx}__warning-meta`,
          kids: [
            Skeletons.Note({ className: `${pfx}__warning-name`, content: r.name }),
            Skeletons.Note({ className: `${pfx}__warning-status`, content: r.statusText }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__warning-ring`,
          styleOpt: { "--pct": `${r.pct}` },
        }),
      ],
    });
  return [
    // Closing the card is "keep uploading", never "drop the files".
    Skeletons.Box.X({
      className: `${pfx}__warning-close`,
      service: "warning-keep",
      uiHandler: [ui],
      kids: [Skeletons.Button.Svg({ className: `${pfx}__warning-close-ico`, ico: "cross", active: 0 })],
    }),
    Skeletons.Note({ className: `${pfx}__warning-icon`, content: "!" }),
    Skeletons.Note({ className: `${pfx}__warning-title`, content: copy.title }),
    Skeletons.Note({ className: `${pfx}__warning-body`, content: copy.body }),
    Skeletons.Box.Y({ className: `${pfx}__warning-list`, kids: rows.map(row) }),
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

const { filesize } = require("core/utils")

const __window_downloader_progress = function (_ui_, total) {
  const pfx = `${_ui_.fig.family}`;
  const header = Skeletons.Box.Y({
    className: `${pfx}__purge-header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__purge-title`,
        kids: [
          Skeletons.Note({
            className: "line one",
            sys_pn: "btn-status",
            content: LOCALE.TRASH_BEING_EMPTIED
          })
        ]
      })
    ]
  });

  const progress = {
    kind: 'progress_bar',
    sys_pn: "progress",
    partHandler: _ui_,
    className: `${pfx}__purge-progress`,
    // label: LOCALE.IN_PROGRESS,
    // total,
    autoDestroy: _a.no,
    uiHandler: [_ui_],
  };

  const a = Skeletons.Box.Y({
    sys_pn: "progress-container",
    className: `${pfx}__purge-container`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__purge-content`,
        debug: __filename,
        kids: [header, progress]
      })
    ]
  })

  return a;
};

module.exports = __window_downloader_progress;

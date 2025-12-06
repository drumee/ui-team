const { getFileIcon, formatSpeed } = require('./helpers');
const { filesize } = require("core/utils");

/**
 * Create file item skeleton for upload progress window
 * @param {Object} ui - Window instance
 * @param {Object} item - Upload item with fileName, progress, speed, status
 * @returns {Object} Skeleton object
 */
module.exports = function fileItem(ui, item) {
  const pfx = `${ui.fig.family}__file-item`;
  const fileName = item.fileName || "Unknown file";
  const progress = item.progress || 0;
  const speed = item.speed || 0;
  const status = item.status || 'uploading';
  const fileSize = item.fileSize || (item.file && item.file.size) || 0;
  const fileIcon = getFileIcon(item.file || { name: fileName, type: item.file?.type });
  
  // Check if upload is completed (either status is 'completed' or progress is 100%)
  const isCompleted = status === 'completed' || progress >= 100;
  const isUploading = status === 'uploading' && progress < 100;
  
  // Determine if clickable (completed status)
  const isClickable = isCompleted;
  
  // Use 'completed' status if progress is 100% but status hasn't updated yet
  const displayStatus = isCompleted ? 'completed' : status;
  
  return Skeletons.Box.Y({
    className: `${pfx}`,
    dataset: {
      fileName: fileName,
      status: displayStatus,
      clickable: isClickable ? "1" : "0"
    },
    service: isClickable ? "click-upload-item" : null,
    uiHandler: isClickable ? [ui] : null,
    kids: [
      // File icon and name row
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          // File icon (keep original size)
          Skeletons.Button.Svg({
            className: `${pfx}-icon`,
            ico: fileIcon,
            active: 0,
          }),
          // File name, speed, and progress bar container (210px width)
          Skeletons.Box.Y({
            className: `${pfx}-info`,
            kids: [
              // File name and speed on same line
              Skeletons.Box.X({
                className: `${pfx}-name-speed`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}-name`,
                    content: fileName,
                  }),
                  isUploading && speed > 0 ? [
                    Skeletons.Note({
                      className: `${pfx}-separator`,
                      content: " • ",
                    }),
                    Skeletons.Note({
                      className: `${pfx}-speed`,
                      sys_pn: `speed-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                      content: formatSpeed(speed),
                    }),
                  ] : [],
                ].flat().filter(Boolean),
              }),
              // Progress bar (only for uploading status and progress < 100%, 210px width)
              isUploading ? Skeletons.Box.Y({
                className: `${pfx}-progress-wrapper`,
                kids: [
                  Skeletons.Box.Y({
                    className: `${pfx}-progress-bar`,
                    kids: [
                      Skeletons.Element({
                        tagName: 'div',
                        className: `${pfx}-progress-fill`,
                        sys_pn: `progress-fill-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                        style: {
                          width: `${Math.round(progress)}%`
                        }
                      })
                    ]
                  })
                ]
              }) : null,
            ].filter(Boolean),
          }),
          // Cancel button when uploading or checkmark when completed (flex-shrink: 0)
          isUploading ? Skeletons.Note({
            className: `${pfx}-cancel`,
            content: LOCALE.CANCEL || "Cancel",
            service: "cancel-upload",
            uiHandler: [ui],
            dataset: { fileName: fileName },
          }) : isCompleted ? Skeletons.Box.X({
            className: `${pfx}-check`,
            kids: [
              Skeletons.Button.Svg({
                className: `${pfx}-check-svg`,
                ico: "upload-checked",
                active: 0,
              }),
            ]
          }) : null,
        ].filter(Boolean),
      }),
    ].filter(Boolean),
  });
};


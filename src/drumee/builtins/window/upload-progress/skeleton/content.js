/**
 * Content skeleton for upload progress window
 * Contains: file list container (items rendered dynamically)
 */

module.exports = function content(ui) {
  const pfx = `${ui.fig.family}`;
  
  // File list container - items will be rendered dynamically by index.js
  const fileList = Skeletons.Box.Y({
    className: `${pfx}__file-list`,
    sys_pn: "file-list",
    kids: []
  });
  
  // Body (collapsible)
  return Skeletons.Box.Y({
    className: `${pfx}__body`,
    kids: [fileList]
  });
};


/**
 * Footer skeleton for upload progress window
 * Contains: estimated time and action button (cancel all or close)
 */

module.exports = function footer(ui) {
  const pfx = `${ui.fig.family}`;
  
  // Check if all uploads are completed
  const uploadItems = ui.getUploadItems ? ui.getUploadItems() : [];
  const hasUploading = uploadItems.some(item => item.status === 'uploading');
  const allCompleted = uploadItems.length > 0 && uploadItems.every(item => 
    item.status === 'completed' || item.status === 'cancelled' || item.status === 'error'
  );
  
  return Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      // Estimated time placeholder (will be shown/hidden by logic)
      Skeletons.Note({
        className: `${pfx}__estimated-time`,
        sys_pn: "estimated-time",
        content: LOCALE.LESS_THAN_A_MINUTE_LEFT || "Less than a minute left",
      }),
      // Spacer to push button to the right
      Skeletons.Box.X({
        className: `${pfx}__footer-spacer`,
        kids: []
      }),
      // Action button - always show, positioned on the right
      Skeletons.Note({
        className: allCompleted ? `${pfx}__close` : `${pfx}__cancel-all`,
        sys_pn: "footer-action",
        content: allCompleted ? (LOCALE.CLOSE || "Close") : (LOCALE.CANCEL_ALL || "Cancel all"),
        service: allCompleted ? "close" : "cancel-all",
        uiHandler: [ui],
      }),
    ].filter(Boolean)
  });
};


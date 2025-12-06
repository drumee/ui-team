/**
 * Footer skeleton for upload progress window
 * Contains: estimated time and cancel all button
 */

module.exports = function footer(ui) {
  const pfx = `${ui.fig.family}`;
  
  return Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__estimated-time`,
        sys_pn: "estimated-time",
        content: LOCALE.LESS_THAN_A_MINUTE_LEFT || "Less than a minute left",
      }),
      Skeletons.Note({
        className: `${pfx}__cancel-all`,
        content: LOCALE.CANCEL_ALL || "Cancel all",
        service: "cancel-all",
        uiHandler: [ui],
      }),
    ]
  });
};


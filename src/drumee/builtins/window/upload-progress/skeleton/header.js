/**
 * Header skeleton for upload progress window
 * Contains: upload icon, title, collapse button
 */

module.exports = function header(ui) {
  const pfx = `${ui.fig.family}`;
  
  return Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header-left`,
        kids: [
          // Upload icon
          Skeletons.Box.X({
            className: `${pfx}__icon`,
            kids: [
              Skeletons.Button.Svg({
                className: `${pfx}__icon-svg`,
                ico: "logo-upload",
                active: 0,
              }),
            ]
          }),
          // Title
          Skeletons.Note({
            className: `${pfx}__title`,
            sys_pn: "upload-title",
            content: `${LOCALE.UPLOADING || "Uploading"} 0 ${LOCALE.FILES || "files"}`,
          }),
        ]
      }),
      // Right cluster: collapse/expand + close (X)
      Skeletons.Box.X({
        className: `${pfx}__header-actions`,
        kids: [
          // Collapse/Expand button - wrap in Box to ensure service attribute is rendered
          Skeletons.Box.X({
            className: `${pfx}__collapse-wrapper`,
            service: "toggle-expand",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                className: `${pfx}__collapse`,
                ico: "arrow--pages",
                active: 0,
              }),
            ]
          }),
          // Close (X) — cancels the upload AND dismisses the popup. Its own
          // service, not the footer's "cancel-all": that one now leaves the
          // window standing so its cancelled rows can be read (see cancelAll).
          Skeletons.Box.X({
            className: `${pfx}__close-wrapper`,
            service: "cancel-close",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                className: `${pfx}__close-btn`,
                ico: "cross",
                active: 0,
              }),
            ]
          }),
        ]
      }),
    ]
  });
};


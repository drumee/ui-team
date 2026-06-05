/**
 * Content skeleton for upload progress window
 * Contains: aggregate progress bar + file list container (items rendered dynamically)
 */

module.exports = function content(ui) {
  const pfx = `${ui.fig.family}`;

  // Aggregate (bundle) progress bar
  const aggregate = Skeletons.Box.Y({
    className: `${pfx}__aggregate`, sys_pn: "aggregate",
    kids: [
      Skeletons.Box.X({ className: `${pfx}__agg-bar`, kids: [
        Skeletons.Box.X({ className: `${pfx}__agg-fill`, sys_pn: "agg-fill" }),
      ]}),
      Skeletons.Note({ className: `${pfx}__agg-text`, sys_pn: "agg-text", content: "" }),
    ],
  });

  // File list container - items will be rendered dynamically by index.js
  const fileList = Skeletons.Box.Y({
    className: `${pfx}__file-list`,
    sys_pn: "file-list",
    kids: []
  });

  // Body (collapsible)
  return Skeletons.Box.Y({
    className: `${pfx}__body`,
    kids: [aggregate, fileList]
  });
};

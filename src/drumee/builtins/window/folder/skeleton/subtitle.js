const __skl_folder_topbar_subtitle = function (_ui_) {
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__subtitle-wrapper`,
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__subtitle-wrapper files`,
        content: "8 files ",
      }),
      Skeletons.Note({
        content: "Last updated: 4:59 pm. Jun 30, 2025",
      }),
    ],
  });
  return a;
};

module.exports = __skl_folder_topbar_subtitle;

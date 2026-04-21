module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`,    content: LOCALE.STORAGE_CONSOLE }),
      Skeletons.Note({ className: `${pfx}__subtitle`, content: LOCALE.STORAGE_CONSOLE_DESC }),
    ],
  });
};

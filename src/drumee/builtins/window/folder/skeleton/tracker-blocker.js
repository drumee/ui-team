module.exports = function trackerBlocker(ui) {
  const pfx = `${ui.fig.family}__tracker`;

  return Skeletons.Box.Y({
    className: `${pfx}-blocker`,
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: `${pfx}-title`,
        content: LOCALE.TRACKER,
      }),
      Skeletons.Note({
        className: `${pfx}-message`,
        content: LOCALE.TRACKER_UNAVAILABLE,
      }),
    ],
  });
};

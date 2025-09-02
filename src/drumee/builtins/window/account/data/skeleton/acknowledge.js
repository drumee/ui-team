module.exports = function (_ui_, data) {
  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__acknowledge`,
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__acknowledge-text`,
        content: (data.recipient.printf(LOCALE.VALIDATION_SENT_TO))
      })
    ]
  });
};

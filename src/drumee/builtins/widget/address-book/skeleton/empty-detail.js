module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__empty-detail`,
    kids: [
      Skeletons.Image.Svg({
        className: `${fig}__empty-detail-icon`,
        ico: "account_contacts",
      }),
      Skeletons.Note({
        className: `${fig}__empty-detail-title`,
        content: LOCALE.SELECT_CONTACT || "Select a contact",
      }),
      Skeletons.Note({
        className: `${fig}__empty-detail-sub`,
        content: LOCALE.SELECT_CONTACT_HINT
          || "Pick a contact from the list to see details and actions.",
      }),
    ],
  });
};

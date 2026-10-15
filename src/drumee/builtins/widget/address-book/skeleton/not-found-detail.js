// What the detail area shows when showContact() is asked for someone who is
// not in the book (a Chat details member who is no contact). Laid out like
// empty-detail; names the person when the caller knew the name, and offers
// Add contact (the invite dialog), pre-filled with their email when known.
module.exports = function (ui, who = {}) {
  const fig = ui.fig.family;
  const name = (who.name || "").trim();
  return Skeletons.Box.Y({
    className: `${fig}__empty-detail ${fig}__not-found-detail`,
    kids: [
      Skeletons.Image.Svg({
        className: `${fig}__empty-detail-icon`,
        ico: "account_contacts",
      }),
      Skeletons.Note({
        className: `${fig}__empty-detail-title`,
        content: name
          ? LOCALE.CONTACT_NOT_FOUND_NAMED.format(name)
          : LOCALE.CONTACT_NOT_FOUND,
      }),
      Skeletons.Note({
        className: `${fig}__empty-detail-sub`,
        content: LOCALE.CONTACT_NOT_FOUND_HINT,
      }),
      // Same flow as the header's "Add contacts" (the invite dialog).
      Skeletons.Box.X({
        className: `${fig}__btn ${fig}__btn--primary ${fig}__not-found-add`,
        bubble: 0,
        service: "add-not-found-contact",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ className: `${fig}__not-found-add-ico`, ico: "ph-plus" }),
          Skeletons.Note({
            className: `${fig}__not-found-add-label`,
            content: LOCALE.CONTACT_NOT_FOUND_ADD,
          }),
        ],
      }),
    ],
  });
};

// Shared action-button builders for the address-book widget, used by both the
// detail footer (contact-detail.js) and the sidebar list hover actions
// (contact-list.js). Archive and Accept render as text buttons; every other
// action is an icon button.

// Text button (e.g. Archive, Accept).
function actionBtn(fig, kind, label, service, extra, ui) {
  return Skeletons.Note({
    className: `${fig}__btn ${fig}__btn--${kind}`,
    content: label,
    bubble: 0,
    service,
    uiHandler: [ui],
    ...extra,
  });
}

// Icon-only button. `label` becomes the native tooltip so the icon stays
// discoverable. `kind` is "danger" (red) or "neutral".
function iconBtn(fig, kind, ico, label, service, extra, ui) {
  const variant = kind === "danger" ? ` ${fig}__action-icon--danger` : "";
  return Skeletons.Button.Svg({
    ico,
    className: `${fig}__action-icon${variant}`,
    attrOpt: { title: label },
    bubble: 0,
    service,
    uiHandler: [ui],
    ...extra,
  });
}

// Icon + text button (icon on the left, label on the right). `kind` is
// "primary" (solid), "neutral" (purple tint) or "danger" (red tint).
function iconTextBtn(fig, kind, ico, label, service, extra, ui) {
  return Skeletons.Box.X({
    className: `${fig}__detail-btn ${fig}__detail-btn--${kind}`,
    bubble: 0,
    service,
    uiHandler: [ui],
    ...extra,
    kids: [
      Skeletons.Image.Svg({ className: `${fig}__detail-btn-ico`, ico }),
      Skeletons.Note({ className: `${fig}__detail-btn-label`, content: label }),
    ],
  });
}

module.exports = { actionBtn, iconBtn, iconTextBtn };

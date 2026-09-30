// Shared action-button builders for the address-book detail panel: the
// view's action tiles (contact-detail.js) and the edit form's footer
// buttons (contact-edit.js).

// Full-width footer button, optional icon left of the label (Figma "Save
// change" / "Cancel"). `kind` is "primary" (solid) or "neutral" (grey).
function iconTextBtn(fig, kind, ico, label, service, extra, ui) {
  return Skeletons.Box.X({
    className: `${fig}__detail-btn ${fig}__detail-btn--${kind}`,
    bubble: 0,
    service,
    uiHandler: [ui],
    ...extra,
    kids: [
      ico ? Skeletons.Image.Svg({ className: `${fig}__detail-btn-ico`, ico }) : null,
      Skeletons.Note({ className: `${fig}__detail-btn-label`, content: label }),
    ].filter(Boolean),
  });
}

// Tile button for the detail panel's action grid: icon above label (Figma
// "Contact — Multi-Action"). `kind` is "primary", "neutral" or "danger".
// A non-empty `disabledReason` renders the tile inert — no service, so a
// click dispatches nothing — and shows the reason as its tooltip.
function tileBtn(fig, kind, ico, label, service, extra, ui, disabledReason) {
  const disabled = !!disabledReason;
  return Skeletons.Box.Y({
    className: `${fig}__detail-tile ${fig}__detail-tile--${kind}`,
    bubble: 0,
    ...(disabled
      ? { dataset: { disabled: 1 }, attrOpt: { title: disabledReason } }
      : { service, uiHandler: [ui], ...extra }),
    kids: [
      Skeletons.Image.Svg({ className: `${fig}__detail-tile-ico`, ico }),
      Skeletons.Note({ className: `${fig}__detail-tile-label`, content: label }),
    ],
  });
}

module.exports = { iconTextBtn, tileBtn };

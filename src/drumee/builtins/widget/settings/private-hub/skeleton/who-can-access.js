/**
 * Who can access section
 * Read-only display of access type (Public/Private)
 */
export default function (ui) {
  const fig = `${ui.fig.family}-access`;
  
  const currentAccessOption = { value: 'private', ico: 'lock', label: LOCALE.PRIVATE || "Private" }
  const currentAccessLabel = currentAccessOption.label;

  // Read-only access type (no dropdown / no changing here)
  const accessReadonly = Skeletons.Box.X({
    className: `${fig}__trigger`,
    kids: [
      Skeletons.Button.Svg({
        ico: currentAccessOption.ico,
        className: `${fig}__icon`,
      }),
      Skeletons.Note({
        content: currentAccessLabel,
        className: `${fig}__label`,
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${fig}__section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.WHO_CAN_ACCESS || "Who can access:",
      }),
      Skeletons.Box.X({
        className: `${fig}__dropdown-wrapper`,
        kids: [accessReadonly],
      }),
      Skeletons.Note({
        className: `${fig}__description`,
        content: "Only members in the list below can access content within this folder.",
      }),
    ],
  });
}


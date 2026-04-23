/**
 * Who can access section
 * Read-only display of access type (Public/Private)
 */
export default function (ui) {
  const fig = `${ui.fig.family}-access`;

  // const currentAccessOption = { value: 'private', ico: 'lock', label: LOCALE.PRIVATE || "Private" }

  return Skeletons.Box.Y({
    className: `${fig}__section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.WHO_CAN_ACCESS || "Who can access:",
      }),
      // Skeletons.Box.X({
      //   className: `${fig}__dropdown-wrapper`,
      //   kids: [accessReadonly],
      // }),
      Skeletons.Note({
        className: `${fig}__description`,
        content: LOCALE.ONLY_MEMBERS_CAN_ACCESS,
      }),
    ],
  });
}


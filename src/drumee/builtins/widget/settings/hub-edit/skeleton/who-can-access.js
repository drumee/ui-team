/**
 * Who can access section
 * Includes dropdown for access type (Public/Private) and password checkbox
 */
export default function (ui) {
  const fig = `${ui.fig.family}-access`;
  const accessType = ui.formData?.accessType || 
                     ui.data?.access_type || 
                     'private';
  const hasPassword = ui.formData?.hasPassword || 0;

  // Access type options
  const accessOptions = [
    { value: 'public', ico: 'desktop_public', label: LOCALE.PUBLIC_ANYONE || "Public Anyone" },
    { value: 'private', ico: 'lock', label: LOCALE.PRIVATE || "Private" },
  ];

  const currentAccessOption = accessOptions.find(opt => opt.value === accessType) || accessOptions[0];
  const currentAccessLabel = currentAccessOption.label;

  // Access type dropdown trigger
  const accessTrigger = Skeletons.Box.X({
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
      Skeletons.Button.Svg({
        ico: "arrow--pages",
        className: `${fig}__chevron`,
      }),
    ],
  });

  // Access type dropdown items
  const accessItems = Skeletons.Box.Y({
    className: `${fig}__menu-items`,
    kids: accessOptions.map((opt) => {
      const isActive = accessType === opt.value;
      return Skeletons.Box.X({
        className: `${fig}__menu-item-wrapper${isActive ? " disabled" : ""}`,
        service: "change-access-type",
        name: "change-access-type",
        uiHandler: [ui],
        value: opt.value,
        active: isActive ? 1 : 0,
        dataset: {
          value: opt.value,
        },
        kids: [
          Skeletons.Button.Svg({
            ico: opt.ico,
            className: `${fig}__menu-item-icon`,
          }),
          Skeletons.Button.Label({
            className: `${fig}__menu-item`,
            label: opt.label,
          })
        ],
      });
    }),
  });

  // Access type dropdown
  const accessDropdown = {
    kind: KIND.menu.topic,
    className: `${fig}__dropdown`,
    flow: _a.y,
    opening: _e.click,
    sys_pn: 'access-type-dropdown',
    service: "access-type-menu",
    persistence: _a.once,
    trigger: accessTrigger,
    items: accessItems,
    offsetY: 8,
  };

  return Skeletons.Box.Y({
    className: `${fig}__section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.WHO_CAN_ACCESS || "Who can access:",
      }),
      Skeletons.Box.X({
        className: `${fig}__dropdown-wrapper`,
        kids: [accessDropdown],
      }),
      Skeletons.Note({
        className: `${fig}__description`,
        content: LOCALE.ACCESS_DESCRIPTION || "Anyone, including individuals outside your organisation, will be able to access this folder. Please proceed with caution when sharing sensitive information.",
      }),
    ],
  });
}


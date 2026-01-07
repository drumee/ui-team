/**
 * Who can access section
 * Dropdown menu for access type (Public/Private/Custom)
 */
export default function (ui) {
  const fig = `${ui.fig.family}-access`;
  
  // Try multiple sources to get accessType: formData, data, model, or default
  const accessType = ui.formData?.accessType || 
                     ui.data?.access_type || 
                     (ui.mget && (ui.mget('access_type') || ui.mget(_a.access_type))) ||
                     (ui.mget && ui.mget(_a.area) === 'public' ? 'public' : null) ||
                     (ui.mget && ui.mget(_a.area) === 'share' ? 'public' : null) ||
                     (ui.mget && ui.mget(_a.area) === 'dmz' ? 'public' : null) ||
                     (ui.mget && ui.mget(_a.area) === 'private' ? 'private' : null) ||
                     'private';

  // Access type options
  const accessOptions = [
    { value: 'public', ico: 'desktop_public', label: LOCALE.PUBLIC_ANYONE || "Public Anyone" },
    { value: 'private', ico: 'lock', label: LOCALE.PRIVATE || "Private" },
    { value: 'custom', ico: 'settings', label: LOCALE.CUSTOM || "Custom" },
  ];

  const currentAccessOption = accessOptions.find(opt => opt.value === accessType) || accessOptions[0];
  const currentAccessLabel = currentAccessOption.label;

  // Dropdown trigger
  const menuTrigger = Skeletons.Box.X({
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
        className: `${fig}__arrow-down`,
      }),
    ],
  });

  // Dropdown menu items
  const menuItems = Skeletons.Box.Y({
    className: `${fig}__menu-items`,
    kids: accessOptions.map((opt) => {
      const isActive = opt.value === accessType;
      
      return Skeletons.Box.X({
        className: `${fig}__menu-item-wrapper${isActive ? " active" : ""}`,
        service: "change-access-type",
        name: "change-access-type",
        uiHandler: [ui],
        _value: opt.value,
        dataset: {
          value: opt.value,
        },
        kids: [
          Skeletons.Button.Svg({
            ico: opt.ico,
            className: `${fig}__menu-item-icon`,
          }),
          Skeletons.Button.Label({
            className: `${fig}__menu-item${isActive ? " active" : ""}`,
            label: opt.label,
            ico: null,
            active: isActive ? 1 : 0,
          })
        ],
      });
    }),
  });

  // Dropdown menu
  const accessDropdown = Skeletons.Box.X({
    className: `${fig}__dropdown-wrapper`,
    kids: [{
      kind: KIND.menu.topic,
      className: `${fig}__dropdown`,
      flow: _a.y,
      opening: _e.click,
      sys_pn: `${fig}__access-dropdown`,
      service: "access-type-menu",
      persistence: _a.once,
      trigger: menuTrigger,
      items: menuItems,
      offsetY: 8,
    }],
  });

  return Skeletons.Box.Y({
    className: `${fig}__section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.WHO_CAN_ACCESS || "Who can access:",
      }),
      // accessDropdown,
      Skeletons.Note({
        className: `${fig}__description`,
        content: LOCALE.ACCESS_DESCRIPTION || "Anyone, including individuals outside your organisation, will be able to access this folder. Please proceed with caution when sharing sensitive information.",
      }),
    ],
  });
}


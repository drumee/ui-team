/**
 * Who can access section
 * Read-only display of access type (Public/Private)
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
  ];

  const currentAccessOption = accessOptions.find(opt => opt.value === accessType) || accessOptions[0];
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
        content: LOCALE.ACCESS_DESCRIPTION || "Anyone, including individuals outside your organisation, will be able to access this folder. Please proceed with caution when sharing sensitive information.",
      }),
    ],
  });
}


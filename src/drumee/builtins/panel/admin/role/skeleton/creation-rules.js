module.exports = function (ui) {
  const pfx = ui.fig.family;
  const RADIO = 'creation-who';

  const option = (value, label, state) =>
    Skeletons.Box.X({
      className: `${pfx}__option`,
      radio: RADIO,
      state,
      service: 'set-creation-rule',
      dataset: { value },
      uiHandler: [ui],
      kids: [
        Skeletons.Image.Svg({ ico: 'radio-off', className: `${pfx}__option-radio` }),
        Skeletons.Note({ className: `${pfx}__option-label`, content: label }),
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__creation-rules`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__section-title`,
        kids: [
          Skeletons.Image.Svg({ ico: 'add-box', className: `${pfx}__section-ico` }),
          Skeletons.Note({ className: `${pfx}__section-name`, content: LOCALE.CREATION_RULES }),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__section-sub`, content: LOCALE.WHO_CAN_CREATE }),
      Skeletons.Box.Y({
        className: `${pfx}__options`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__option-row`,
            kids: [
              option('hub-admin-only', LOCALE.HUB_ADMIN_ONLY, 1),
              Skeletons.Box.X({ className: `${pfx}__option-avatars`, sys_pn: 'creation-avatars' }),
            ],
          }),
          option('workspace-hub-admins', LOCALE.WORKSPACE_ADMINS_AND_HUB_ADMINS, 0),
          option('any-member', LOCALE.ANY_MEMBER, 0),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__toggle-row`,
        kids: [
          Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.REQUIRE_APPROVAL }),
          Skeletons.Button.Svg({
            className: `${pfx}__toggle`,
            ico: 'toggle-on',
            sys_pn: 'approval-toggle',
            state: ui.mget('require_approval') ? 1 : 0,
            service: 'toggle-approval',
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};

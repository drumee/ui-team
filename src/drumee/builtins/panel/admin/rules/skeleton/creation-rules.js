module.exports = function (ui) {
  const pfx          = ui.fig.family;
  const RADIO        = 'creation-who';
  const creationRule = ui.mget('creation_rule') || 'hub-admin-only';

  const option = (value, label) =>
    Skeletons.Box.X({
      className: `${pfx}__option`,
      radio: RADIO,
      state: creationRule === value ? 1 : 0,
      service: 'set-creation-rule',
      dataset: { value },
      uiHandler: [ui],
      kids: [
        Skeletons.Note({ className: `${pfx}__radio` }),
        Skeletons.Note({ className: `${pfx}__option-label`, content: label }),
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__creation`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__panel-title`,
        kids: [
          Skeletons.Image.Svg({ ico: 'add-box', className: `${pfx}__panel-ico` }),
          Skeletons.Note({ className: `${pfx}__panel-name`, content: LOCALE.CREATION_RULES }),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__group-label`, content: LOCALE.WHO_CAN_CREATE }),
      Skeletons.Box.Y({
        className: `${pfx}__options`,
        kids: [
          option('hub-admin-only',      LOCALE.HUB_ADMIN_ONLY),
          option('workspace-hub-admins', LOCALE.WORKSPACE_ADMINS_AND_HUB_ADMINS),
          option('any-member',          LOCALE.ANY_MEMBER),
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

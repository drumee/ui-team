module.exports = function (ui) {
  const pfx = ui.fig.family;
  const RADIO_COL  = 'invite-collaborator';
  const RADIO_SEND = 'invite-sender';

  const option = (radio, value, label, desc, state) =>
    Skeletons.Box.X({
      className: `${pfx}__option has-desc`,
      radio,
      state,
      service: radio === RADIO_COL ? 'set-collab-rule' : 'set-sender-rule',
      dataset: { value },
      uiHandler: [ui],
      kids: [
        Skeletons.Image.Svg({ ico: 'radio-off', className: `${pfx}__option-radio` }),
        Skeletons.Box.Y({
          className: `${pfx}__option-body`,
          kids: [
            Skeletons.Note({ className: `${pfx}__option-label`, content: label }),
            Skeletons.Note({ className: `${pfx}__option-desc`,  content: desc  }),
          ],
        }),
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__invite-rules`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__section-title`,
        kids: [
          Skeletons.Image.Svg({ ico: 'user-add', className: `${pfx}__section-ico` }),
          Skeletons.Note({ className: `${pfx}__section-name`, content: LOCALE.INVITE_RULES }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__invite-cols`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__invite-col`,
            kids: [
              Skeletons.Note({ className: `${pfx}__section-sub`, content: LOCALE.WHO_CAN_BE_INVITED }),
              option(RADIO_COL, 'same-team',       LOCALE.SAME_TEAM_ONLY,           LOCALE.SAME_TEAM_ONLY_DESC,           0),
              option(RADIO_COL, 'anyone-in-hub',   LOCALE.ANYONE_IN_HUB,            LOCALE.ANYONE_IN_HUB_DESC,            1),
              option(RADIO_COL, 'anyone-external', LOCALE.ANYONE_INCLUDING_EXTERNAL, LOCALE.ANYONE_INCLUDING_EXTERNAL_DESC, 0),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__invite-col`,
            kids: [
              Skeletons.Note({ className: `${pfx}__section-sub`, content: LOCALE.WHO_CAN_SEND_INVITES }),
              option(RADIO_SEND, 'workspace-admin', LOCALE.WORKSPACE_ADMIN_ONLY,    LOCALE.WORKSPACE_ADMIN_ONLY_DESC,    0),
              option(RADIO_SEND, 'editor-or-above', LOCALE.ANY_MEMBER_EDITOR_ABOVE, LOCALE.ANY_MEMBER_EDITOR_ABOVE_DESC, 0),
              option(RADIO_SEND, 'any-ws-member',   LOCALE.ANY_MEMBER_OF_WORKSPACE, LOCALE.ANY_MEMBER_OF_WORKSPACE_DESC, 1),
            ],
          }),
        ],
      }),
    ],
  });
};

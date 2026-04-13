const __hub_admin_field_view = function (_ui_) {
  const fig = _ui_.fig.family;
  const hub = _ui_.hub;

  const header = Skeletons.Box.X({
    className: `${fig}__header`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__header-text`,
        kids: [
          Skeletons.Note({
            className: `${fig}__title`,
            content: LOCALE.WHO_HAS_ACCESS
          }),
          Skeletons.Note({
            className: `${fig}__subtitle`,
            content: LOCALE.MANAGE_FOLDER_PERMISSIONS
          })
        ]
      }),
      Skeletons.Button.Svg({
        ico: 'cross',
        className: `${fig}__close`,
        service: _e.close,
        uiHandler: _ui_
      })
    ]
  });

  const matrixSection = Skeletons.Box.Y({
    className: `${fig}__matrix-section`,
    kids: [
      Skeletons.Note({
        className: `${fig}__section-label`,
        content: LOCALE.PERMISSIONS_MATRIX
      }),
      {
        kind: 'invitation_shareeroll',
        className: `${fig}__sharees-roll`,
        hub_id: hub.media.mget(_a.hub_id),
        authority: hub.visitor.get(_a.privilege),
        sharees: hub.mget(_a.users),
        mode: _a.hub,
        sys_pn: 'sharees-roll',
        shareeItem: {
          kind: 'invitation_sharee',
          authority: hub.visitor.get(_a.privilege),
          hub: hub,
          media: hub.media,
          uiHandler: _ui_,
          api: {
            update: SERVICE.hub.set_privilege
          }
        }
      }
    ]
  });

  return [
    header,
    Skeletons.Element({ tagName: 'hr', className: `${fig}__divider` }),
    matrixSection,
    Skeletons.Wrapper.Y({
      name: 'dialog',
      className: `${fig}__dialog`
    })
  ];
};
module.exports = __hub_admin_field_view;

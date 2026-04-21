module.exports = function (ui) {
  const pfx = ui.fig.family;

  const provider = (pn, ico, name, badge, key) =>
    Skeletons.Box.X({
      className: `${pfx}__sso-item`,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__sso-logo-wrap`,
          kids: [Skeletons.Image.Svg({ ico, className: `${pfx}__sso-logo` })],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__sso-info`,
          kids: [
            Skeletons.Note({ className: `${pfx}__sso-name`,  content: name  }),
            Skeletons.Note({ className: `${pfx}__sso-badge`, content: badge }),
          ],
        }),
        Skeletons.Button.Svg({
          className: `${pfx}__toggle`,
          ico: 'toggle-on',
          sys_pn: pn,
          state: ui.mget(key) ? 1 : 0,
          service: 'toggle-sso',
          dataset: { key },
          uiHandler: [ui],
        }),
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__sso-panel`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__panel-header`,
        kids: [
          Skeletons.Image.Svg({ ico: 'sso', className: `${pfx}__panel-ico` }),
          Skeletons.Note({ className: `${pfx}__panel-name`, content: LOCALE.SSO_PROVIDERS }),
        ],
      }),
      provider('sso-okta',   'okta',   'Okta',              'ENTERPRISE',  'sso_okta'),
      provider('sso-google', 'google', 'Google Workspace',  'ACTIVE',      'sso_google'),
      provider('sso-azure',  'azure',  'Azure AD',          'CLOUD AUTH',  'sso_azure'),
    ],
  });
};

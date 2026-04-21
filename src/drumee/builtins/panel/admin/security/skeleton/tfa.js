module.exports = function (ui) {
  const pfx = ui.fig.family;

  const item = (pn, ico, title, desc, key) =>
    Skeletons.Box.X({
      className: `${pfx}__tfa-item`,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__tfa-icon-wrap`,
          kids: [Skeletons.Image.Svg({ ico, className: `${pfx}__tfa-ico` })],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__tfa-info`,
          kids: [
            Skeletons.Note({ className: `${pfx}__tfa-title`, content: title }),
            Skeletons.Note({ className: `${pfx}__tfa-desc`,  content: desc  }),
          ],
        }),
        Skeletons.Button.Svg({
          className: `${pfx}__toggle`,
          ico: 'toggle-on',
          sys_pn: pn,
          state: ui.mget(key) ? 1 : 0,
          service: 'toggle-tfa',
          dataset: { key },
          uiHandler: [ui],
        }),
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__tfa-panel`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__panel-header`,
        kids: [
          Skeletons.Image.Svg({ ico: 'security', className: `${pfx}__panel-ico` }),
          Skeletons.Note({ className: `${pfx}__panel-name`, content: LOCALE.TWO_FACTOR_AUTH }),
          Skeletons.Note({ className: `${pfx}__badge recommended`, content: LOCALE.RECOMMENDED }),
        ],
      }),
      item('tfa-app', 'phone',    LOCALE.AUTHENTICATOR_APP, LOCALE.AUTHENTICATOR_APP_DESC, 'tfa_app'),
      item('tfa-sms', 'sms',      LOCALE.SMS_AUTH,          LOCALE.SMS_AUTH_DESC,          'tfa_sms'),
      item('tfa-key', 'key',      LOCALE.HARDWARE_KEYS,     LOCALE.HARDWARE_KEYS_DESC,     'tfa_key'),
    ],
  });
};

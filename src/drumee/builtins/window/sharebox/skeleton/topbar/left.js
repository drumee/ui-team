// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : ui/src/drumee/builtins/window/sharebox/skeleton/topbar/left.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_window_team_topbar = function (_ui_) {
  const pfx = `${_ui_.fig.family}-topbar`;

  const media = _ui_.mget(_a.media);

  let emailNotification = "";
  if (Organization.get('useEmail')) {
    emailNotification = Skeletons.Button.Svg({
      ico: 'email',
      className: `${pfx}__icon email-notification`,
      service: 'open-email-notifcataion',
      uiHandler: _ui_,
    });
  }

  const shareLink = Skeletons.Button.Svg({
    ico: 'editbox_link',
    className: `${pfx}__icon share-link`,
    service: 'copy-share-link',
    uiHandler: _ui_,
    tooltips: {
      content: LOCALE.COPYLINK,
    }
});

  let _expiryStatus = _a.closed;
  if (media.mget('dmz_expiry') === _a.expired) {
    _expiryStatus = _a.open;
  }

  const validityIcon = Skeletons.Box.X({
    className: `${pfx}__expiry-time-wrapper`,
    sys_pn: 'validity-expired-wrapper',
    dataset: {
      mode: _expiryStatus
    },
    kids: [
      Skeletons.Button.Svg({
        ico: 'raw-clock',
        className: `${pfx}__icon expiry-time`,
        tooltips: {
          content: LOCALE.SHAREBOX_VALIDITY_EXPIRE
        }
      })
    ]
  });

  const a = Skeletons.Box.X({
    className: `${pfx}__container`,
    debug: __filename,
    sys_pn: 'container-action',
    kids: [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),
      emailNotification,
      shareLink,
      validityIcon
    ]
  });

  return a;
};

module.exports = __skl_window_team_topbar;

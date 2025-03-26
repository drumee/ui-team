
const _log = function (_ui_, item) {
  const intime = Dayjs.unix(item.intime).fromNow();
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__connection-log-row`,
    service: 'see-log-details',
    uiHandler: _ui_.getHandlers(_a.ui)[0],
    dataset: {
      status: item.status
    },
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note(`${intime}`, `${_ui_.fig.family}__connection-field intime`),
      Skeletons.Note(`${item.device.family}`, `${_ui_.fig.family}__connection-field device`),
      Skeletons.Note(`${item.city}`, `${_ui_.fig.family}__connection-field city`)
    ]
  });
  return a;
};

// -----------------------------------------
const _account_content_security = function (_ui_) {
  let uiHandler = _ui_;
  const _settings = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__block`, //u-flex-grow"
    kids: [
      Skeletons.Note(LOCALE.SECURITY_SETTINGS, `${_ui_.fig.group}__title`),
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__column pad `,
        kids: [
          { kind: 'security_pass', uiHandler },
          { kind: 'security_email', uiHandler },
          { kind: 'security_ident', uiHandler },
          { kind: 'security_phone', uiHandler },
        ]
      })
    ]
  });

  let optMethods = [];
  // for (let m of Platform.get('TfaMethods')) {
  //   let kind = `otp_${m}`;
  //   optMethods.push({ kind, uiHandler })
  // }

  const _authentication = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__block`, //u-flex-grow"
    kids: [
      Skeletons.Note(LOCALE.MULTI_FACTOR_AUTH, `${_ui_.fig.group}__title`),
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__column u-ai-center `, //u-jc-center"
        kids: [{ kind:"security_otp", uiHandler }]
      })
    ]
  });

  const _connection = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__block`,
    kids: [
      Skeletons.Note(LOCALE.CONNECTION_LOG, `${_ui_.fig.group}__title`),
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__log--container`,
        sys_pn: 'log-details',
        partHandler: _ui_
      }),

      Skeletons.List.Smart({
        className: `${_ui_.fig.family}__connection-log container`,
        sys_pn: 'roll-log',
        vendorOpt: Preset.List.Orange_e,
        itemsOpt: _log,
        uiHandler,
        api: {
          service: SERVICE.drumate.show_login_log,
          hub_id: Visitor.id
        }
      })
    ]
  });

  const main = Skeletons.Box.X({
    className: `u-jc-sa ${_ui_.fig.family}__main --content`, //"security-container u-flex-grow u-jc-st"
    kids: [_settings, _authentication, _connection]
  });

  const roll = Skeletons.List.Smart({
    // kind      : KIND.list.stream
    // flow      : _a.y
    debug: __filename,
    className: `${_ui_.fig.family}__inner`,
    sys_pn: "roll-content",
    vendorOpt: Preset.List.Orange_e,
    kids: [main]
  });

  const wrapper = Skeletons.Wrapper.Y({
    name: "modal",
    className: `${_ui_.fig.family}__modal`,
    uiHandler
  });

  const popup = Skeletons.Wrapper.Y({
    name: "popup",
    className: `${_ui_.fig.family}__popup`,
    uiHandler
  });

  const overlayWrapper = require('./overlay-wrapper').default(_ui_);

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__main`,
    kids: [roll, wrapper, popup, overlayWrapper]
  });

  return a;
};

module.exports = _account_content_security;

// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/security/main.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_members_security (_ui_) {
  const securityFig = `${_ui_.fig.family}-security`;
  const data = _ui_.mget(_a.member)
  let _mode, isMobileNo, _fContent;
  
  _mode = _a.enable
  isMobileNo = _a.yes
  if (_.isEmpty(data.mobile)) {
    isMobileNo = _a.no
    _mode = _a.disable
    _fContent = LOCALE.CHANGE_IMPOSSIBLE
  }

  if (Visitor.domainCan(_K.permission.admin_member, data.privilege)) {
    isMobileNo = _a.no
    _mode = _a.disable
    _fContent = LOCALE.FOR_SECURITY_DOUBLE_AUTHENTICATION//'For Security reasons, double authentication is mandatory'
  }

  const footerContent = Skeletons.Note({
    className  : `${_ui_.fig.family}-security__note response-msg failure`,
    content    : _fContent,
  })

  const closeIcon = Skeletons.Box.X({
    className   : `${securityFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${securityFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]
  });

  const header = Skeletons.Box.X({
    className  : `${securityFig}__header`,
    kids: [
      Skeletons.Note({
        className  : `${securityFig}__note header`,
        content    : LOCALE.SECURITY
      }),

      closeIcon
    ]
  })

  const headerInfo = Skeletons.Box.X({
    className  : `${securityFig}__header-info`,
    kids: [
      Skeletons.Note({
        className  : `${securityFig}__note header-info`,
        content    : LOCALE.ADMIN_SECURITY_POPUP_HEADER_SUB_INFO
      })
    ]
  })

  const optIcon = Skeletons.Box.X({
    className  : `${securityFig}__optIcon`,
    kids: [
      Skeletons.Button.Svg({
        ico       : 'account_sms',
        className : `${securityFig}__icon sms-icon account_sms`,
      })
    ]
  })

  const subContent = Skeletons.Box.Y({
    className  : `${securityFig}__subContent`,
    kids: [
      Skeletons.Note({
        className  : `${securityFig}__note sub-header`,
        content    : LOCALE.DOUBLE_AUTHENTICATION
      }),

      Skeletons.Box.X({
        className  : `${securityFig}__switch`,
        kids: [
          Skeletons.Switch({
            className   : `${securityFig}__switch-wrapper`,
            sys_pn      : 'security-switch',
            service     : 'toggle-double-authentication',
            uiHandler   : _ui_,
            state       : toggleState(data.otp),
            values      : ['0', _a.sms],
            isMobile    : isMobileNo,
            vendorOpt   : [
              {label: LOCALE.DISABLED},
              {label: LOCALE.ENABLED}
            ],
            dataset    : {
              mode  : _mode
            }
          })
        ]
      })
    ]
  })
  
  const content = Skeletons.Box.X({
    className   : `${securityFig}__content`,
    sys_pn      : 'security-content',
    kids        : [
      optIcon,
      subContent
    ]
  });

  const footer = Skeletons.Box.X({
    className   : `${securityFig}__footer`,
    sys_pn      : 'security-footer',
    kids        : [
      footerContent
    ]
  });
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${securityFig}__main`,
    kids        : [
      header,
      headerInfo,
      content,
      footer
    ]
  });
  
  return a;
};

export default __skl_members_security;
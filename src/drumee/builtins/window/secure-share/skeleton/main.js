
const __skl_secure_share = function(_ui_) {
  const pfx   = _ui_.fig.family;
  const group = _ui_.fig.group;

  const topbar = Skeletons.Box.X({
    className : `${group}-topbar__container`,
    sys_pn    : 'topbar',
    service   : _e.raise,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__topbar-title forbiden`,
        kids      : [
          Skeletons.Note({
            sys_pn    : 'window-label',
            className : _a.name,
            content   : `${LOCALE.SECURE_SHARE} — ${_ui_.mget(_a.filename) || ''}`
          })
        ]
      }),
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]
  });

  const header = Skeletons.Box.X({
    className : `${pfx}__header ${group}__header`,
    kids      : [topbar]
  });

  const emailRow = Skeletons.Box.X({
    className : `${pfx}__row`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.SECURE_SHARE_RECIPIENT }),
      Skeletons.EntryBox({
        className    : `${pfx}__input email`,
        sys_pn       : 'ref-email',
        formItem     : _a.email,
        type         : _a.email,
        placeholder  : LOCALE.SECURE_SHARE_EMAIL_PLACEHOLDER,
        preselect    : 1,
        errorHandler : [_ui_],
        validators   : [
          { reason: LOCALE.SECURE_SHARE_ENTER_EMAIL, comply: Validator.require },
          { reason: LOCALE.INVALID_EMAIL,            comply: Validator.email }
        ],
        showError : false
      })
    ]
  });

  const domainRow = Skeletons.Box.X({
    className : `${pfx}__row`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.SECURE_SHARE_DOMAIN_RESTRICTION }),
      Skeletons.EntryBox({
        className   : `${pfx}__input domain`,
        sys_pn      : 'ref-domain',
        formItem    : 'domain_restriction',
        type        : _a.text,
        placeholder : 'company.com',
        showError   : false
      })
    ]
  });

  const expiryRow = Skeletons.Box.X({
    className : `${pfx}__row expiry`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.SECURE_SHARE_EXPIRY }),
      Skeletons.EntryBox({
        className   : `${pfx}__input days`,
        sys_pn      : 'ref-days',
        formItem    : 'days',
        type        : _a.number,
        placeholder : '0',
        showError   : false
      }),
      Skeletons.Note({ className: `${pfx}__expiry-sep`, content: LOCALE.DAY }),
      Skeletons.EntryBox({
        className   : `${pfx}__input hours`,
        sys_pn      : 'ref-hours',
        formItem    : 'hours',
        type        : _a.number,
        placeholder : '0',
        showError   : false
      }),
      Skeletons.Note({ className: `${pfx}__expiry-sep`, content: LOCALE.HOUR })
    ]
  });

  const createButton = Skeletons.Box.X({
    className : `${pfx}__row buttons`,
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__button submit button`,
        service   : 'create-secure-share',
        uiHandler : [_ui_],
        kidsOpt   : { active: 0 },
        kids      : [
          Skeletons.Note({ content: LOCALE.SECURE_SHARE_CREATE })
        ]
      })
    ]
  });

  const linkResult = Skeletons.Box.X({
    className : `${pfx}__row link-result`,
    sys_pn    : 'link-result',
    dataset   : { mode: _a.closed }
  });

  const body = Skeletons.Box.Y({
    className : `${pfx}__body`,
    kids      : [ emailRow, domainRow, expiryRow, createButton, linkResult ]
  });

  const shareList = Skeletons.Box.Y({
    className : `${pfx}__share-list`,
    sys_pn    : 'share-list'
  });

  const listSection = Skeletons.Box.Y({
    className : `${pfx}__list-section`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__list-header`, content: LOCALE.SECURE_SHARE_EXISTING }),
      shareList
    ]
  });

  return Skeletons.Box.Y({
    className : `${pfx}__main ${group}__main drive-popup`,
    radio     : _a.parent,
    debug     : __filename,
    kids      : [ header, body, listSection ]
  });
};

module.exports = __skl_secure_share;

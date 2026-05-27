
const __skl_secure_share = function(_ui_) {
  const pfx = `${_ui_.fig.family}`;

  const title = Skeletons.Note({
    className : `${pfx}__title`,
    content   : `${LOCALE.SECURE_SHARE} — ${_ui_.mget(_a.filename) || ''}`
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
    sys_pn    : 'button-wrapper',
    dataset   : { mode: _a.open },
    kids      : [
      Skeletons.Note({
        className : `${pfx}__button submit`,
        content   : LOCALE.SECURE_SHARE_CREATE,
        service   : 'create-secure-share',
        uiHandler : _ui_
      })
    ]
  });

  const linkResult = Skeletons.Box.X({
    className : `${pfx}__row link-result`,
    sys_pn    : 'link-result',
    dataset   : { mode: _a.closed }
  });

  const shareList = Skeletons.Box.Y({
    className : `${pfx}__share-list`,
    sys_pn    : 'share-list'
  });

  const a = Skeletons.Box.Y({
    className : `${pfx}__main`,
    debug     : __filename,
    kids      : [
      Preset.Button.Close(_ui_),
      title,
      Skeletons.Box.Y({
        className : `${pfx}__form`,
        kids      : [ emailRow, domainRow, expiryRow, createButton, linkResult ]
      }),
      Skeletons.Box.Y({
        className : `${pfx}__list-section`,
        kids      : [ shareList ]
      })
    ]
  });

  return a;
};

module.exports = __skl_secure_share;

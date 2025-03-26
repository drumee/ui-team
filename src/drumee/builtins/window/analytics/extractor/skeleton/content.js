// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/api/lib/b2b-signup/skeleton/form.coffee
//   TYPE : Skelton
// ==================================================================== *
const __row = function (_ui_, iconName, opt) {
  const formFig = _ui_.fig.family;
  const icon = Skeletons.Button.Svg({
    ico: iconName,
    className: `${formFig}__icon input-icon-prefix`
  });
  opt.cn = opt.cn || '';
  let cn = opt.cn || '';
  delete opt.cn;
  const a = Skeletons.Box.Y({
    className: `${formFig} row-wrapper input-wrapper ${cn}`,
    kids: [
      Skeletons.EntryBox({
        className: `${formFig}__entry with-icon`,
        formItem: opt.formItem,
        sys_pn: `entry-${opt.formItem}`,
        uiHandler: _ui_,
        prefix: icon,
        errorHandler: [_ui_],
        showError: true,
        ...opt
      }),
    ]
  });
  return a;
};

/**
 * 
 */
function _isDate(s) {
  return /^[0-9]{2}.+[0-9]{2}.+[0-9]{2,4}$/.test(s);
}

const __date_form = function (_ui_) {
  const formFig = _ui_.fig.family;
  let yesterday = Dayjs.unix(Dayjs().unix() - 60*60*24).format(Visitor.dateformat());
  const date = {
    mode: _a.commit,
    placeholder: Visitor.dateformat(),
    validators: [
      {
        reason: Visitor.dateformat(),
        comply: _isDate
      }
    ]
  };

  let vars = _ui_.mget(_a.vars) || {};
  let use_domains = 0;
  let domains = null;
  if (vars.params && _.isArray(vars.params.domains)) {
    domains = vars.params.domains.join(',');
    use_domains = vars.params.domains.length;
    domains = vars.params.domains;
  }
  const formElements = Skeletons.Box.G({
    className: `${_ui_.fig.family}__content`,
    kids: [
      __row(_ui_, 'desktop__clock', { ...date, formItem: _a.start, value: yesterday }),
      __row(_ui_, 'desktop__clock', { ...date, formItem: _a.end, value: yesterday }),
    ]
  });

  if (use_domains) {
    formElements.kids.push(
      __row(_ui_, 'desktop__clock', {
        ...date,
        formItem: "domains",
        cn: "domains",
        iconName: "backoffice_public",
        value: domains
      })
    )
  }

  const button = Skeletons.Box.X({
    className: `${_ui_.fig.family}__button-wrapper`,
    sys_pn: "go-button-wrapper",
    kids: [
      Skeletons.Box.X({
        className: `${formFig}_go_btn_wrapper`,
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__button action-btn`,
            service: _e.submit,
            content: LOCALE.GO
          })
        ]
      })
    ]
  });

  const errorMessage = Skeletons.Box.X({
    className: `${_ui_.fig.family}__row ${_ui_.fig.group}__error-wrapper`,
    sys_pn: "error-message-wrapper",
    dataset: {
      state: _a.closed
    },
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.group}__error-message`,
        sys_pn: "error-message",
        content: ""
      })
    ]
  });

  const form = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__container`,
    kids: [
      formElements,
      button,
      errorMessage
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__main`,
    kids: [
      form
    ]
  });
  return a;
};
module.exports = __date_form; 

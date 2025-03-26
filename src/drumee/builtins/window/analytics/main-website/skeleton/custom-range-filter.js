// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/analytics/main-website/skeleton/custom-range-filter.js
//   TYPE : Skeleton
// ==================================================================== *

const __row = function (_ui_, iconName, opt) {
  const customRangeFig = `${_ui_.fig.family}-custom-range`;

  const icon = Skeletons.Button.Svg({
    ico: iconName,
    className: `${customRangeFig}__icon input-icon-prefix`
  });
  opt.cn = opt.cn || '';
  let cn = opt.cn || '';
  delete opt.cn;
  const a = Skeletons.Box.Y({
    className: `${customRangeFig} row-wrapper input-wrapper ${cn}`,
    kids: [
      {
        kind : KIND.datepicker,
        className: `${customRangeFig}__entry with-icon`,
        name: 'daterange',
        placement: 'down',
        service: 'select-date',
        formItem: opt.formItem,
        uiHandler: _ui_,
        ...opt
      },
      // Skeletons.EntryBox({
      //   className: `${customRangeFig}__entry with-icon`,
      //   formItem: opt.formItem,
      //   sys_pn: `entry-${opt.formItem}`,
      //   uiHandler: _ui_,
      //   prefix: icon,
      //   errorHandler: [_ui_],
      //   showError: true,
      //   ...opt
      // }),
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
  const customRangeFig = `${_ui_.fig.family}-custom-range`;
  const now = (Dayjs().valueOf() / 1000);
  let yesterday = Dayjs().valueOf - 24 * 60 * 60, "X").format("DD/MM/yy");
  //let today = Dayjs().valueOf, "X").format("DD/MM/yy");
  const date = {
    mode: _a.commit,
    placeholder: "JJ/MM/AAAA",
    validators: [
      {
        reason: "JJ/MM/AAAA",
        comply: _isDate
      }
    ]
  };

  const formElements = Skeletons.Box.G({
    className: `${customRangeFig}__content`,
    kids: [
      __row(_ui_, 'desktop__clock', { ...date, formItem: _a.start, value: yesterday }),
      __row(_ui_, 'desktop__clock', { ...date, formItem: _a.end, value: yesterday }),
    ]
  });

  const form = Skeletons.Box.Y({
    className: `${customRangeFig}__container`,
    kids: [
      formElements
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${customRangeFig}__main`,
    kids: [
      form
    ]
  });

  return a;
};

export default __date_form; 

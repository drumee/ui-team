// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/analytics/main-website/skeleton/form.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {Array} options
 * @param {String} role
 * @param {String} _label
 * @param {Object} _ui_
 */
const __row_dropdown = function (options, role, _label, _ui_) {
  const formFig = `${_ui_.fig.family}-form`;

  const dropdownMenu = {
    kind    : 'widget_dropdown_menu',
    options,
    role
  }

  let sfClass;
  if (_ui_.secondFilter) {
    sfClass = 'second-filter';
  }
  const r = Skeletons.Box.Y({
    className : `${formFig}__filter-elements ${sfClass}`,
    kids      : [
      Skeletons.Note({
        className : `${formFig}__filter-label`,
        content   : _label
      }),
      dropdownMenu
    ]
  })

  return r;
}


/**
 * @param {*} _ui_
*/
const __skl_analytics_main_website_form = function (_ui_) {
  const formFig = `${_ui_.fig.family}-form`;

  let sfClass;
  if (_ui_.secondFilter) {
    sfClass = 'second-filter';
  }

  const rangeFilter = Skeletons.Box.X({
    className : `${formFig}__custom-range-filter ${sfClass}`,
    kids      : [
      Skeletons.Box.X({
        className : `${formFig}__datepicker-wrapper ${sfClass}`,
        kids      : [
          Skeletons.Button.Svg({
            ico: 'drumee-calendar',
            className: `${formFig}__icon input-icon-prefix`
          }),

          {
            kind : KIND.datepicker,
            innerClass: `${formFig}__datepicker with-icon`,
            name: 'daterange',
            placement: 'down',
            openPosition: 'right',
            service: 'select-date',
            uiHandler: _ui_,
            ranges: true,
          }
        ]
      })
    ]
  })

  const formRangeWrapper = Skeletons.Box.Y({
    className : `${formFig}__custom-range-filter-wrapper ${sfClass}`,
    sys_pn    : 'custom-range-filter',
    kids      : [
      Skeletons.Note({
        className : `${formFig}__filter-label`,
        content   : 'Select Range'
      }),
      rangeFilter
    ]
  })

  let secondFilter;
  if (_ui_.secondFilter) {
    secondFilter = __row_dropdown(_ui_.secondFilterOptions, _ui_.secondFilterType, _ui_.secondFilterLabel, _ui_)
  }

  const formElements = Skeletons.Box.X({
    className : `${formFig}__elements-wrapper ${sfClass}`,
    kids      : [
      formRangeWrapper,
      __row_dropdown(_ui_.filterOptions, _ui_.filterType, _ui_.filterLabel, _ui_),
      secondFilter
    ]
  })

  const button = Skeletons.Box.X({
    className: `${formFig}__button-wrapper ${sfClass}`,
    sys_pn: "go-button-wrapper",
    kids: [
      Skeletons.Box.X({
        className: `${formFig}__go-btn-wrapper`,
        kids: [
          Skeletons.Note({
            className: `${formFig}__button action-btn`,
            service: _e.submit,
            content: LOCALE.GO
          })
        ]
      })
    ]
  });

  const errorMessage = Skeletons.Box.X({
    className: `${formFig}__error-msg-wrapper ${_ui_.fig.group}__error-wrapper`,
    sys_pn: "error-message-wrapper",
    dataset: {
      state: _a.closed
    },
    kids: [
      Skeletons.Note({
        className: `${formFig}__error-message`,
        sys_pn: "error-message",
        content: ""
      })
    ]
  });

  const form = Skeletons.Box.X({
    className: `${formFig}__container`,
    kids: [
      formElements,
      button
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${formFig}__main`,
    kids: [
      form,
      errorMessage
    ]
  });

  return a;
};

export default __skl_analytics_main_website_form;

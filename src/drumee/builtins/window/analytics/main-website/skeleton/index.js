// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/analytics/main-website/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_analytics_main_website = function (_ui_) {
  const formFig = _ui_.fig.family;

  const form = Skeletons.Box.Y({
    className: `${formFig}__container`,
    kids: [
      Skeletons.Box.X({
        className : `${formFig}__form-elements`,
        kids      : [
          require('./form').default(_ui_)
        ]
      })
    ]
  });

  const chartContainer = Skeletons.Box.X({
    className : `${formFig}__chart-container`,
    sys_pn    : 'chart-container'
  })

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${formFig}__main`,
    kids: [
      form,
      chartContainer
    ]
  });
  
  return a;
};

export default __skl_analytics_main_website;

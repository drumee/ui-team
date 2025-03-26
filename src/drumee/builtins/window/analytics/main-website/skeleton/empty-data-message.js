// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/analytics/main-website/skeleton/empty-data-message.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_analytics_main_website_empty_data_message = function (_ui_) {
  const emptyDataFig = `${_ui_.fig.family}-empty-data`;

  const message = Skeletons.Note({
    className : `${emptyDataFig}__note message`,
    content   : 'No data to show for the selected period.'
  })

  const message1 = Skeletons.Note({
    className : `${emptyDataFig}__note message message-1`,
    content   : 'Please select some other range/page to view data.'
  })

  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${emptyDataFig}__message-container`,
    kids      : [
      message,
      message1
    ]
  });
  
  return a;
};

export default __skl_analytics_main_website_empty_data_message;

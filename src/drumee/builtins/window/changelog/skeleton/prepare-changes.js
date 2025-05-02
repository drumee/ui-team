/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/


function _sk_prepare_changes(_ui_, text, showButtons = 0) {
  const contentFig = `${_ui_.fig.family}`;

  let buttons = Skeletons.Box.X({
    className: `${contentFig}__command`,
    uiHandler: _ui_,
    kids: [
      Skeletons.Note({
        className: `button ignore window-confirm__button-secondary`,
        content: LOCALE.OK,
        service: _e.close
      }),
    ]
  })

  //  let spinner = null;
  if (!showButtons) {
    buttons = '';
    // spinner = Skeletons.Note({
    //   className: `drumee-spinner`,
    // });
  }

  const summary = Skeletons.Box.Y({
    className: `${contentFig}__engine-off`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__engine-off text`,
        content: text
      }),
    ]
  })

  // if(spinner){
  //   summary.kids.push(spinner);
  // }

  let a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__container`,
        kids: [
          summary,
          buttons
        ]
      })
    ]
  })

  return a;
}
module.exports = _sk_prepare_changes;

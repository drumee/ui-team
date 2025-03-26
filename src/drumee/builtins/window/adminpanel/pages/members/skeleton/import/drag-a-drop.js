/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/members/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../../@types/index.d.ts" />


function __skl_import_members_drag_page (_ui_) {

  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__members_drag-area fullwidth`,
    kids: [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__droppable-area fullwidth`,
        kids: [
          Skeletons.Note({
            className  : `${_ui_.fig.family}__droppable-content`,
            content: LOCALE.DRAG_DROP_EXCEL_FILE //"Drag & drop here the excel file with list of members"
          }),
          Skeletons.Note({
            service: 'download-member-sample-file',
            className  : `${_ui_.fig.family}__download-sample-file`,
            content: LOCALE.SEE_THE_FORMAT//"See excel list member format"
          })
        ]
      })
    ]
  })

  return a;
}

export default __skl_import_members_drag_page;
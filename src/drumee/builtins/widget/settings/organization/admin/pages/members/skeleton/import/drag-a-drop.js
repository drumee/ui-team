/// <reference path="../../../../../../../../../@types/index.d.ts" />


function __skl_import_members_drag_page (ui) {

  let a = Skeletons.Box.Y({
    className  : `${ui.fig.family}__members_drag-area fullwidth`,
    kids: [
      Skeletons.Box.X({
        className  : `${ui.fig.family}__droppable-area fullwidth`,
        kids: [
          Skeletons.Note({
            className  : `${ui.fig.family}__droppable-content`,
            content: LOCALE.DOWNLOAD_USERSLIST
          }),
          Skeletons.Note({
            service: 'download-members-template',
            className  : `${ui.fig.family}__download-sample-file`,
            content: LOCALE.DOWNLOAD_TEMPLATE_FILE
          })
        ]
      })
    ]
  })

  return a;
}

export default __skl_import_members_drag_page;
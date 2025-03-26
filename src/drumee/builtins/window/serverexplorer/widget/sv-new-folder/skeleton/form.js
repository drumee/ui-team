// ================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : src/drumee/builtins/window/serverexplorer/widget/sv-new-folder/skeleton/form.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_sv_new_folder_form (_ui_) {
  const sklFig = `${_ui_.fig.family}-form`;

  const header = Skeletons.Box.X({
    className   : `${sklFig}__wrapper header`,
    kids        : [
      Skeletons.Note({
        className   : `${sklFig}__note header`,
        content     : "Create a Folder"
      })
    ]
  })

  const name = Skeletons.Box.X({
    className   : `${sklFig}__wrapper folder-name`,
    kids        : [
        // Skeletons.Note({
        //   className   : `${sklFig}__note lable`,
        //   content     : "Folder Name"
        // }),

        Skeletons.EntryBox({
          className     : `${sklFig}__entry name`,
          name          : _a.name,
          placeholder   : LOCALE.FOLDER_NAME, 
          preselect     : 1,
          formItem      : _a.name,
          uiHandler     : _ui_,
          errorHandler  : [_ui_],
          showError     : 1,
          validators    : [
            { reason: "require", comply: Validator.require }  
          ]
        }),
      ]
  })

  const errorWrapper =  Skeletons.Wrapper.Y({
    className : `${sklFig}__wrapper error-message`,
    name      : "errorBox"
  })
  


  const form = Skeletons.Box.Y({
    className  : `${sklFig}__container`,
    kids       : [
      name,
      errorWrapper
    ]
  })


  let buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel     : LOCALE.CANCEL || '',
    cancelService   : 'close-model',
    confirmLabel    : LOCALE.CREATE    || '',
    confirmService  : 'create-dir'
  })


  
  const a = Skeletons.Box.Y({
    className   : `${sklFig}__body`,
    debug       : __filename,
    kids        : [
      header,
      form,
      buttons,
    ]
  });
  
  return a;
}; 

export default __skl_sv_new_folder_form;
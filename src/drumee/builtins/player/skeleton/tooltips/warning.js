module.exports = function(_ui_, title, content) {
  const prefix = "warning";
  const body = [
    Skeletons.Box.X({
      className : "u-jc-center",
      kids: [
        Skeletons.Note({
          content   : title,
          className : `${_ui_.fig.group}-${prefix}__header my-30`
        })
      ]
    }),        
    Skeletons.Box.Y({
      className : `${_ui_.fig.group}-${prefix}__body mx-45`,
      sys_pn    : _a.body,
      uiHandler : _ui_,
      kids:[
        Skeletons.Note({
          content,
          className : `${_ui_.fig.group}-${prefix}__content mb-28`
        }),
        Skeletons.Box.X({
          className: `${_ui_.fig.group}-${prefix}__commands mb-28`,
          kids: [
            Skeletons.Note({
              content   : "Ok",
              ui        : _ui_,
              service   : "close-dialog",
              className : `${_ui_.fig.group}-${prefix}__button`
            })
          ]
        })
      ]
    })
  ];

  return Skeletons.Box.Y({
    className  : `mb-20 ${_ui_.fig.group}-${prefix}__main`,
    debug : __filename,
    kids: [
      Preset.Button.Close(_ui_, "close-dialog"),
      Skeletons.Box.Y({
        uiHandler : _ui_,
        area    : _a.private,
        className  : `${_ui_.fig.group}-${prefix}__container u-jc-sb u-ai-center`,
        kids  : body
      })
    ]
  });
};

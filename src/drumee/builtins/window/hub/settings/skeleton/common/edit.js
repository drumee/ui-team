const __hub_admin_field_edit = function (_ui_) {
  const a = [
    Skeletons.Note({
      className: `${_ui_.fig.field}__label`,
      content: _ui_.mget(_a.label)
    }),
    Skeletons.Box.X({
      sys_pn: "wrapper-field",
      className: `${_ui_.fig.field}__input u-ai-center`,
      kids: [
        Skeletons.Note({
          content: _ui_.mget(_a.name) || _ui_.mget(_a.content),
          attrOpt: {
            title: _ui_.mget(_a.name)
          },
          className: `${_ui_.fig.field}__value`
        })
      ]
    }),
    Skeletons.Box.X({
      sys_pn: "wrapper-cmd",
      className: `u-ai-center ${_ui_.fig.field}__container-button-ok`,
      dataset: {
        editable: _ui_.editable
      },
      kids: [
        Skeletons.Button.Svg({
          className: `${_ui_.fig.field}__icon info ${_ui_.fig.group}__icon`,
          ico: "desktop_sharebox_edit",
          uiHandler: _ui_,
          service: _e.edit
        })
      ]
    }),
    Skeletons.Wrapper.Y({
      name: "dialog",
      className: `${_ui_.fig.field}__permission ${_ui_.fig.group}__permission`
    })
  ];
  return a;
};
module.exports = __hub_admin_field_edit;

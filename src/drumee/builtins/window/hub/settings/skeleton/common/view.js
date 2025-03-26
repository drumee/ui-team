const __hub_admin_field_view = function (_ui_) {
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
          className: `${_ui_.fig.field}__value`
        })
      ]
    }),
    Skeletons.Box.X({
      sys_pn: "wrapper-cmd",
      className: "u-ai-center"
    }),
    Skeletons.Wrapper.Y({
      name: "dialog",
      className: `${_ui_.fig.field}__permission ${_ui_.fig.group}__permission`
    }, { top: "100%" })
  ];
  return a;
};
module.exports = __hub_admin_field_view;

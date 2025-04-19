function __skl_signin_history(_ui_) {
  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__visual`,
        sys_pn: "visual",
      }),
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__content`,
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__name`,
            content: _ui_.mget(_a.name)
          }),
          Skeletons.Note({
            className: `${_ui_.fig.family}__host`,
            content: _ui_.mget(_a.domain)
          }),
        ]
      }),
      Skeletons.Button.Svg({
        ico: 'account_cross',
        className: `${_ui_.fig.family}__icon`,
        service: 'remove-endpoint',
      })
    ]
  })

  return a;
}
module.exports = __skl_signin_history;

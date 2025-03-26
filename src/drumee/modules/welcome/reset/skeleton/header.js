function __skl_welcome_reset_header (_ui_) {
  const headerFig = _ui_.fig.family

  const method = _ui_._method
  const mode = _ui_._mode

  let headerTitle = Host.get('org_name')|| 'Drumee'
  let _content = ''

  if ((mode == _a.loader) && (method == 'complete')) {
    headerTitle = LOCALE.PASSWORD_CHANGED_SUCCESSFULLY
  }
  
  if (method == _a.password) {
    _content = LOCALE.CREATE_NEW_PASSWORD
  }
  if(Visitor.parseModuleArgs().reason == 'new-account'){
    _content = LOCALE.CHOOSE_PASSWORD
  }
  const header = Skeletons.Box.Y({
    className  : `${headerFig}__header-content`,
    kids       : [
      Skeletons.Note({
        className  : `${headerFig}__note header`,
        content    : headerTitle
      }),

      Skeletons.Note({
        className  : `${headerFig}__note steps`,
        content    : _content
      })
    ]
  })

  return header;

}

export default __skl_welcome_reset_header
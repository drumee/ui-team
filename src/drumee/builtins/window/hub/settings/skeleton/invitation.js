const __skl_invitation = function (_ui_) {
  const a = {
    kind: 'invitation',
    debug: __filename,
    className: "w-100 u-ai-center",
    media: _ui_.media,
    hub: _ui_.hub,
    sharees: _ui_.mget(_a.users),
    mode: _a.hub,
    topLabel: LOCALE.ACCESS_LIST,
    shareeItem: {
      map: {
        users: _a.id
      },
      api: {
        remove: SERVICE.hub.delete_contributor,
        update: SERVICE.hub.set_privilege
      }
    },

    authority: _ui_.visitor.get(_a.privilege),
    default_privilege: _ui_.mget(_a.default_privilege),
    uiHandler: _ui_,
    service: _e.update
  };
  if (_ui_.visitor.get(_a.privilege) & (_K.permission.owner | _K.permission.admin)) {
    a.bottomLabel = LOCALE.MODIFY_LIST;
    a.service = "new-invitation";
  }
  return a;
};

module.exports = __skl_invitation;

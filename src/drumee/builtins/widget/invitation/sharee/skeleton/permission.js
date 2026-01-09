

const __sharee_permission = function (ui, cmd) {
  let opt;
  // const doff = ui.dialogWrapper.$el.offset();
  // const ioff = ui.$el.offset();
  // const y = (ioff.top - doff.top) + ui.$el.innerHeight();

  return opt = {
    kind: 'invitation_permission',
    source: cmd,
    signal: _e.ui.event,
    service: _a.commit,
    modify: ui.editable,
    button: _a.yes,
    api: ui.getApi(_e.update),
    hub_id: ui.mget(_a.hub_id),
    nid: ui.mget(_a.nodeId),
    share_id: ui.mget(_a.share_id),
    uid: ui.mget(_a.id),
    email: ui.mget(_a.email),
    permission: ui.mget(_a.permission),
    sys_pn: 'permission',
    aliases: {
      privilege: _a.permission
    },
    days: ui.mget(_a.days),
    hours: ui.mget(_a.hours),
    limit: ui.mget(_a.limit),
    uiHandler: ui,
    //partHandler  : ui
    styleOpt: {
      top: y
    }
  };
};

module.exports = __sharee_permission;

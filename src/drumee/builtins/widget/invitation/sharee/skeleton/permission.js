/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/sharee/skeleton/editable
//   TYPE : Skelton
// ==================================================================== *


const __sharee_permission=function(_ui_, cmd){
  let opt;
  const doff = _ui_.dialogWrapper.$el.offset();
  const ioff = _ui_.$el.offset();
  const y = (ioff.top - doff.top) + _ui_.$el.innerHeight();

  return opt = { 
    kind       : 'invitation_permission',
    source     : cmd,
    signal     : _e.ui.event,
    service    : _a.commit,
    modify     : _ui_.editable,
    button     : _a.yes,
    api        : _ui_.getApi(_e.update),
    hub_id     : _ui_.mget(_a.hub_id),
    nid        : _ui_.mget(_a.nodeId),
    share_id   : _ui_.mget(_a.share_id),
    uid        : _ui_.mget(_a.id),
    email      : _ui_.mget(_a.email),
    permission : _ui_.mget(_a.permission),
    sys_pn     : 'permission',
    aliases    : { 
      privilege : _a.permission
    }, 
    days       : _ui_.mget(_a.days),
    hours      : _ui_.mget(_a.hours),
    limit      : _ui_.mget(_a.limit),
    uiHandler    : _ui_,
    //partHandler  : _ui_
    styleOpt   : {
      top      : y
    }
  };
};

module.exports = __sharee_permission;

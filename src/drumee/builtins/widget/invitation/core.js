// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : builtins/widget/recipient/manager
//   TYPE : Module
// ==================================================================== *

class __invitation_core extends LetcBox {
 
  
// ===========================================================
// _removeOrrevoke
// ===========================================================
  removeOrrevoke() {
    let nid;
    const api = this.getApi(_e.remove);

    if (api != null) {
      this.postService(api);
      //@debug "aaa 37 122 136", api
      return; 
    }
    if (!~~(this.mget('is_share') != null)) {
      this.softDestroy();
      return; 
    }
    if (~~this.mget('is_link')) {
      const share_id = this.mget(_a.share_id) || this.mget(_a.message);
      if (_.isArray(this.mget(_a.nodeId))) {
        ({
          nid
        } = this.mget(_a.nodeId)[0]); 
      } else { 
        nid = this.mget(_a.nodeId);
      }
      return this.postService({
        service     : SERVICE.sharebox.remove_link,
        hub_id      : this.mget(_a.hub_id),
        nid, //@mget(_a.nodeId)
        share_id
      });
    } else {
      return this.postService({
        service     : SERVICE.sharebox.revoke_permission,
        hub_id      : this.mget(_a.hub_id),
        nid         : [this.mget('resource_id')],
        user_id     : this.mget('entity_id')
      });
    }
  }

// ===========================================================
// 
// ===========================================================
  getApi(name) {
    if (!this.mget(_a.api)) {
      return null; 
    }

    const svc = this.mget(_a.api)[name];
    const map = this.mget(_a.map);
    const api =
      {service : svc};
    if (_.isObject(map)) { 
      for (let k in map) { 
        const v = map[k];
        api[k] = this.mget(v);
      }
    }
    api.hub_id = this.mget(_a.hub_id); 
    this.debug("aaa 37 122 136", api);
    return api; 
  }


// ===========================================================
//
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    //this.debug("AAAAAAAAAAAAAA 731", method, data, socket, this.mget(_a.api));
    switch (method) {
      case SERVICE.sharebox.revoke_permission: case SERVICE.sharebox.remove_link: case SERVICE.hub.delete_contributor:
        this.service = "item-deleted";
        this.triggerHandlers();
        return this.softDestroy();
      default: 
        if (method === this.mget(_a.api).service) {
          return this.softDestroy();
        }
    }
  }
}
//__invitation_core.initClass();

module.exports = __invitation_core;

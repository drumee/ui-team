// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : builtins/hub/admin/members/members
//   TYPE : Module
// ==================================================================== *

const __core = require('../hubname');
class __hub_name extends __core {


  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    super.initialize(opt);
    this.hub = opt.hub;
    this.model.set({
      label: LOCALE.FOLDER_NAME,
      name: this.hub.media.mget(_a.filename),
      settingsId : `${opt.hub_id}.filename`
    });
  }

  /**
   * 
   * @param {*} data 
   */
  doCommit(data) {
    let media = this.hub.media;

    //this.debug("AAAA:28 -- DO COMMIT ", data, this);
    let args = {
      filename: data.value,
      nid: media.mget(_a.nodeId),
      service: SERVICE.media.rename,
      hub_id: Visitor.id // Because it's a hub 
    };

    this.postService(args).then((data) => {
      this.debug("AAAA:28 -- DO COMMIT ", data, this);
      media.afterRename(data);
      //this.hub.mget(_a.source).update_name(_a.filename, data.filename);
      this.mset(_a.name, data.args.dest.filename);
      this.reload();
    });
  }

}

module.exports = __hub_name;

// =============================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : core/mfs
//   TYPE : 
// =============================================================== *

const { dataTransfer } = require("core/utils")
const __msf = require('./mfs');
const ATTRIBUTES = [
  _a.ctime,
  _a.ext,
  _a.filename,
  _a.filepath,
  _a.filetype,
  _a.home_id,
  _a.hub_id,
  _a.isalink,
  _a.md5Hash,
  _a.mtime,
  _a.nid,
  _a.origin,
  _a.ownpath,
  _a.pid,
  _a.privilege,
  _a.status,
  'syncOptions',
];
class __core_mfs_storage extends __msf {


  /**
   * 
   * @param {*} target 
   * @param {*} e 
   * @param {*} p 
   * @param {*} token 
   */
  sendTo(target, e, p, token) {
    const r = dataTransfer(e);
    this._sendTo(target, r, p, token);
  }


  /**
   * 
   */
  getDataForSync(model) {
    if (this.mget(_a.phase) == _a.creating || this.isUploading) {
      return null;
    }
    try {
      if (this.isAttachment()) return null;
      if (this.logicalParent.isSearch || this.logicalParent.isTrash) return null;
    } catch (e) {
    }
    //if (this.mget(_a.isalink) && this.isRegularFile()) return null;
    if (this.mget(_a.filetype) == _a.schedule) return null;
    let data = {};
    let m = model || this.model;
    for (var k of ATTRIBUTES) {
      let val = m.get(k);
      if (val == null) continue;
      if ([_a.filename, _a.filepath].includes(k)) {
        data[k] = m.get(k).replace(/(\\+|\/{2,})/g, '/').replace(/(\/+)$/g, '').replace(/\<.*\>/g, '');
      } else {
        data[k] = m.get(k);
      }
    }
    if (data.filepath) {
      m.set(_a.file_path, data.filepath);
    } else {
      data.filepath = m.get(_a.file_path);
      m.set(_a.filepath, data.filepath)
    }
    if (this.mget(_a.isalink)) {
      if (this.isRegularFile()) {
        data.isalink = 1;
      } else {
        data.isalink = 0;
      }
    }
    return data;
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   * @returns 
   */

  // completeLiveUpdate(service, data, options) {
  //   //super.onLiveUpdate(service, data, options);
  //   this.debug("AAA:99 WWWW", this.el, this.mget(_a.filesize), service, data, options);
  //   switch (service) {
  //     case "media.move":
  //       if (!data.__oldItem || !data.__newItem) return;
  //       MfsScheduler.log(service, data);
  //       break;
  //     case "media.new": 
  //     case "media.mk_dir":
  //       MfsScheduler.log(service, data);
  //       break;
  //     case _SVC.media.copy:
  //       if (!data.__oldItem || !data.__newItem) return;
  //       this.debug("AAA:117 WWWW", data.__newItem.pid, this.getCurrentNid(), this.el, data, options);
  //       if (data.__newItem && data.__newItem.pid == this.getCurrentNid()) {
  //         MfsScheduler.log(service, data);
  //       }
  //       //MfsScheduler.log(service,  { ...data, name: service });
  //       break;

  //   }
  // }

  /**
   * 
   */
  onUploadEnd(response) {
    //this.debug("AAA:791 AAA:133 onUploadEnd");
    this.isUploading = 0;

    super.onUploadEnd(response, "media:created");
  }

  /**
   * 
   * @returns 
   */
  pluginUrl() {
    const path = `${this.getLogicalParent().getCurrentPath()}/${this.mget(_a.filename)}.${this.mget(_a.ext)}`;
    return `https://${this.mget(_a.vhost)}${bootstrap().appRoot}#$/${path}`;
  }


}

module.exports = __core_mfs_storage;

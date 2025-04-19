// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/window/core
//   TYPE : Core 
// ==================================================================== *


// function sendMessage(service, data) {
//   edBridge.send("web-mfs-show-node", { ...data, name: service });
// }

/**
 * 
 * @param {*} target 
 */
function normalizePath(target) {
  let ppath = target.get(_a.filepath) || target.get('file_path');
  if (!ppath) {
    target.debug("SHOULD HAVE filepath", target);
  }
  // if (/^(hub|folder)$/.test(target.get(_a.filetype))) {
  //   let re = new RegExp(`(\.${target.get(_a.ext)})|(\.${target.get(_a.hub_id)})|(\.${target.get(_a.area)})$`)
  //   ppath = ppath.replace(re, '');
  // }
  return ppath;
}



const __utils = require('./utils');

class __window_core extends __utils {
  initialize(opt) {
    super.initialize(opt);
    let m = opt.media;
    //this.debug("AAAA:36", opt);
    if (!m) return;
    this.basepath = normalizePath(m.model);
    //mfs.showNode(m.getDataForSync());
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  buildIconsList(child, pn) {
    super.buildIconsList(child, pn);
    let re = null;
    if (this.basepath) {
      re = new RegExp('^' + this.basepath);
    } else {
      this.basepath = '';
    }
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
  //     case "media.new": case "media.mk_dir":
  //       MfsScheduler.log(service, data);
  //       break;
  //     case _SVC.media.copy:
  //       if (!data.__oldItem || !data.__newItem) return;
  //       this.debug("AAA:117 WWWW", this.el, data, options);
  //       if (data.__newItem && data.__newItem.pid == this.getCurrentNid()) {
  //         MfsScheduler.log(service, data);
  //       }
  //       //MfsScheduler.log(service,  { ...data, name: service });
  //       break;

  //   }
  // }

  /**
   * 
   * @param {*} media 
   */
  openContent(media) {
    //this.debug("AAA:111", media);
    if (!media.getDataForSync) return;
    let data = media.getDataForSync();
    if (!data) return;
    MfsScheduler.showNode(data);
  }

  /**
   * 
   */
  hasChanges(changes) {
    if (!changes) return false;
    let { local, remote } = changes;
    let gotChanges = false;
    for (let side of [local, remote]) {
      for (let r of _.values(side)) {
        if (!_.isEmpty(r)) {
          gotChanges = true;
          break;
        }
      }
    }
    return gotChanges;
  }

}


module.exports = __window_core;

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

const mfsInteract = require('../interact');
/**
 * @class __window_wallpaper
 * @extends __window_interact
*/
class __window_wallpaper extends mfsInteract {

  // class __window_wallpaper extends __window_interact {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);

  }

  /**
 *
 */
  static initClass() {
    this.prototype.isFolder = 1;
    this.prototype.events = {
      dragenter: "fileDragEnter",
      dragover: "fileDragOver",
    };
  }


  /**
  * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
      role: _a.search
    });
    this.acceptMedia = 1;
    this.isWallpaperSettings = 1;
    this.captured = {};
    // this.contextmenuSkeleton = 'a';
    // this.style.set({
    //   width: this.size.width,
    //   height: this.size.height,
    //   left: (window.innerWidth / 2) - (this.size.width / 2),
    //   top: (window.innerHeight / 2) - (this.size.height / 2)
    // });

  }

  upload(e, token) {
    let target;
    this.debug("upload wallpaper", e, token);
  }



  fileDragEnter(e) {
    this.debug("fileDragEnter", e);
    e.stopPropagation();
    e.preventDefault();
    return false;
    //e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  fileDragOver(e) {
    this.debug("fileDragOver", e);

    e.stopPropagation();
    e.preventDefault();
    return false;
    //e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  seek_insertion(moving) {
    this.debug("seek_insertion wallpaper", moving);
    this.captured.self = moving;
    this.captured.self.pos = _e.end;
    this.raise()
    this.el.dataset.over = _a.on;
    return this;
  }

  insertMedia(items, options = {}) {
    this.debug("insertMedia wallpaper", items, options);
    this.raise();
  }

  sendTo(target, e, p, token) {
    this.debug("sendTo wallpaper", target, e, p, token);
  }

  /**
  *
  */
  onDomRefresh() {

    this.feed(require("./skeleton").default(this));
    this.raise();
    this.ensurePart("uploader").then((p) => {
      this.raise();
      p.$el.droppable({
        tolerance: "touch",
        over: this.mediaDragOver,
        out: this.mediaDragLeave,
        drop: this.mediaDrop,
        greedy: true
      });
    });
  }

  mediaDragOver(e) {
    this.debug("mediaDragOver", e);
    e.stopPropagation();
    e.preventDefault();
    return false;
  }

  mediaDragLeave(e) {
    this.debug("mediaDragLeave", e);
    e.stopPropagation();
    e.preventDefault();
    return false;
  }

  mediaDrop(e) {
    this.debug("mediaDrop", e);
    e.stopPropagation();
    e.preventDefault();
    return false;
  }
  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug(`onUiEvent service=${service}`, cmd, this);

    switch (service) {

      case _e.close:
        return this.goodbye();
      case "set-wallpaper":
        var opt = {
          wallpaper: {
            nid: cmd.model.get(_a.nodeId),
            hub_id: cmd.model.get(_a.hub_id) || cmd.model.get(_a.ownerId),
            vhost: cmd.model.get(_a.vhost)
          }
        };
        return this.postService({
          service: SERVICE.drumate.update_settings,
          settings: opt,
          hub_id: Visitor.id
        }, { async: 1 }).then((data) => {
          Visitor.set({ settings: JSON.parse(data.settings) });
          uiRouter.setWallpaper(Visitor.wallpaper());
        });


    }
  }

  /**
   * @param {*} type
  */
  getCurrentApi(type) {
    const wp = Platform.get('wallpaper');

    let api = {
      service: SERVICE.media.get_by_type,
      page: 1,
      type: _a.image,
      nid: wp.path,
      sort: _a.rank,
      order: 'desc',
      vhost: wp.vhost,
      timer: 2000
    };
    return api;
  }

}
// __window_wallpaper.initClass();
module.exports = __window_wallpaper;

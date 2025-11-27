const __window_interact = require('../interact');

/**
 * @class __window_wallpaper_settings
 * @extends __window_interact
*/
class __window_wallpaper_settings extends __window_interact {

  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.fileDragLeave = this.fileDragLeave.bind(this);
  }

  /**
   *
   */
  static initClass() {
    this.prototype.isFolder = 1;
    this.prototype.acceptMedia = 1;
    this.prototype.figName = "window_wallpaper_settings";
    this.prototype.events = {
      dragenter: "fileDragEnter",
      dragover: "fileDragOver",
      dragleave: "fileDragLeave",
      drop: "fileDrop"
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
  }

  /**
   * Handle file drag enter event
   */
  fileDragEnter(e) {
    this.debug("fileDragEnter", e);
    e.stopPropagation();
    e.preventDefault();
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    // Show visual feedback on uploader area
    const uploader = this.findPart('uploader');
    if (uploader && uploader.el) {
      uploader.el.dataset.over = _a.on;
    }
    
    return false;
  }

  /**
   * Handle file drag over event
   */
  fileDragOver(e) {
    this.debug("fileDragOver", e);
    e.stopPropagation();
    e.preventDefault();
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    // Keep visual feedback on uploader area
    const uploader = this.findPart('uploader');
    if (uploader && uploader.el) {
      uploader.el.dataset.over = _a.on;
    }
    
    return false;
  }

  /**
   * Handle file drag leave event
   */
  fileDragLeave(e) {
    this.debug("fileDragLeave", e);
    
    // Remove visual feedback when leaving uploader area
    const uploader = this.findPart('uploader');
    if (uploader && uploader.el) {
      uploader.el.dataset.over = _a.off;
    }
    
    return false;
  }

  /**
   * Handle file drop event
   */
  fileDrop(e) {
    this.debug("fileDrop", e);
    e.stopPropagation();
    e.preventDefault();
    
    // Remove visual feedback
    const uploader = this.findPart('uploader');
    if (uploader && uploader.el) {
      uploader.el.dataset.over = _a.off;
    }
    
    if (!e.dataTransfer) {
      this.debug("fileDrop: no dataTransfer", e);
      return false;
    }
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      this.handleUpload(files);
    }
    return false;
  }

  /**
   * Handle upload files
   */
  handleUpload(files) {
    this.debug("handleUpload wallpaper settings", files);
    if (files && files.length > 0) {
      this.insertMedia(Array.from(files), 0);
    }
  }

  /**
   * Insert media files
   */
  insertMedia(items, options = {}) {
    this.debug("insertMedia wallpaper settings", items, options);
    if (!_.isArray(items)) {
      items = [items];
    }
    
    // Get wallpaper folder path
    const wp = Platform.get('wallpaper');
    if (!wp || !wp.path) {
      this.warning("Wallpaper folder not found");
      return this;
    }
    
    // Upload files to wallpaper folder using media core
    const listPart = this.findPart('roll-wallpaper');
    if (!listPart) {
      this.warning("Wallpaper list not found");
      return this;
    }
    
    // Filter only image files
    const imageFiles = Array.from(items).filter(file => {
      if (file instanceof File) {
        return file.type.startsWith('image/');
      }
      return false;
    });
    
    if (imageFiles.length === 0) {
      this.warning("No image files to upload");
      return this;
    }
    
    // Use uploadInplace for batch upload
    if (listPart.uploadInplace) {
      // Create a fake event object with files
      const fakeEvent = {
        dataTransfer: {
          files: imageFiles
        },
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      
      listPart.uploadInplace(fakeEvent).then(() => {
        // Refresh gallery after upload completes
        if (listPart.restart) {
          listPart.restart();
        }
      }).catch((err) => {
        this.debug("Upload error", err);
      });
    } else {
      // Fallback: upload files one by one
      for (let file of imageFiles) {
        if (listPart.uploadFile) {
          listPart.uploadFile(file, wp.path);
        } else {
          // Last resort: use _insertMedia
          const uploadItem = {
            file: file,
            phase: _a.upload,
            nid: wp.path,
            hub_id: wp.hub_id || Visitor.id,
            vhost: wp.vhost
          };
          this._insertMedia(uploadItem, 0);
        }
      }
      
      // Refresh gallery after a delay
      _.delay(() => {
        if (listPart.restart) {
          listPart.restart();
        }
      }, 2000);
    }
    
    return this;
  }

  /**
   *
   */
  onDomRefresh() {
    this.debug("__window_wallpaper_settings onDomRefresh", this);
    this.feed(require("./skeleton").default(this));
  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    this.raise();
    switch(pn) {
      case _a.content:
        this._content = child;
        this.setupInteract();
        this.waitElement(child.el, () => {
          child.feed(require('./skeleton/content').default(this));
        });
        break;
      default:
        return super.onPartReady(child, pn);
    }
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug(`__window_wallpaper_settings onUiEvent service=${service}`, cmd, this);

    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();
        
      case "cancel-set-bg":
        return this.goodbye();
        
      case "apply-new-bg":
        return this._applyWallpaper(cmd);
        
      case "set-wallpaper":
        // Set wallpaper immediately when clicking on image in gallery
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
          // Optionally close window after setting wallpaper
          // return this.goodbye();
        });

      default:
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   * Apply wallpaper changes
   */
  _applyWallpaper(cmd) {
    this.debug("_applyWallpaper", cmd);
    // Close window after applying
    return this.goodbye();
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

__window_wallpaper_settings.initClass();
module.exports = __window_wallpaper_settings;


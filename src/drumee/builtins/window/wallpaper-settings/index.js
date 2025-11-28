const { filesize, timestamp, dataTransfer } = require("core/utils");

const __window_interact = require("../interact");

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
    this.fileDragOver = this.fileDragOver.bind(this);
    this.fileDrop = this.fileDrop.bind(this);
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
      drop: "fileDrop",
    };
  }

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
      role: _a.search,
    });
    this.acceptMedia = 1;
    this.isWallpaperSettings = 1;
  }

  /**
   * Override parent method
   * @returns
   */
  seek_insertion() {
    this.raise();
    const uploader = this.findPart("uploader");
    if (uploader && uploader.el) {
      uploader.el.dataset.over = _a.on;
    }
    return null;
  }

  /**
   * Handle file drag enter event
   */
  fileDragEnter(e) {
    this.debug("fileDragEnter", e);
    e.stopPropagation();
    e.preventDefault();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }

    // Show visual feedback on uploader area
    const uploader = this.findPart("uploader");
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
      e.dataTransfer.dropEffect = "copy";
    }

    // Keep visual feedback on uploader area
    const uploader = this.findPart("uploader");
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
    const uploader = this.findPart("uploader");
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
    const uploader = this.findPart("uploader");
    if (uploader && uploader.el) {
      uploader.el.dataset.over = _a.off;
    }
    const { files } = dataTransfer(e);
    this.debug("fileDrop extracted", files);

    if (!files || files.length === 0) {
      this.debug("fileDrop: no dataTransfer", e);
      return false;
    }

    if (files && files.length > 1) {
      this.warning(
        "Uploading files to wallpaper is limited to one single file at a time."
      );
      /** consider checking file type */
      return;
    }
    this.handleUpload(files[0]);
    return false;
  }

  /**
   * Handle upload files
   */
  handleUpload(file) {
    this.debug("handleUpload wallpaper settings", file);
    /** Create a folder where to store the wallpaper */
    this.postService(SERVICE.media.make_dir, {
      hub_id: Visitor.id,
      nid: Visitor.get(_a.home_id),
      ownpath: `${LOCALE.PHOTO}/${LOCALE.DESKTOP_WALLPAPER}`,
    }).then((data) => {
      this.debug("mediaDrop make_dir response", data);
      let { nid, home_id, hub_id } = data;
      /** Append media uploader queue */
      this.append({
        kind: "media_uploader",
        mode: "row",
        uiHandler: [this],
      });
      let queue = this.children.last();

      queue.once("quota:exceeded", () => {
        this.warning("Quota exceeded");
      });

      queue.once(_e.eod, (data) => {
        this.debug("Upload completed", data);
      });

      queue.once("upload:response", (data) => {
        this.debug("Got authorization to upload", data);
      });

      let args = {
        destination: {
          nid,
          home_id,
          hub_id,
        },
        file,
        echoId: this.mget("echoId"),
        listener: this,
        position: 0,
      };
      /* send the file to backend using the uploader */
      queue.add(args);
    });
  }

  /**
   * Insert media files
   */
  insertMedia(items, options = {}) {
    this.debug("insertMedia wallpaper settings", items, options);
    return;
  }

  /**
   *
   */
  onDomRefresh() {
    this.debug("__window_wallpaper_settings onDomRefresh", this);
    this.feed(require("./skeleton").default(this));
    this.raise();
  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case _a.content:
        this._content = child;
        this.setupInteract();
        this.waitElement(child.el, () => {
          child.feed(require("./skeleton/content").default(this));
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
    const service =
      args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug(
      `__window_wallpaper_settings onUiEvent service=${service}`,
      cmd,
      this
    );

    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();

      case "cancel-set-bg":
        return this.goodbye();

      case "apply-new-bg":
        return this._applyWallpaper(cmd);

      case "apply-bg-by-color":
        var opt = {
          wallpaper: {
            nid: "",
            hub_id: "",
            vhost: "",
            color: the_color_selected_by_the_user,
          },
        };

        return this.postService(
          {
            service: SERVICE.drumate.update_settings,
            settings: opt,
            hub_id: Visitor.id,
          },
          { async: 1 }
        ).then((data) => {
          Desk.restart();
        });

      case "set-wallpaper":
        // Set wallpaper immediately when clicking on image in gallery
        var opt = {
          wallpaper: {
            nid: cmd.model.get(_a.nodeId),
            hub_id: cmd.model.get(_a.hub_id) || cmd.model.get(_a.ownerId),
            vhost: cmd.model.get(_a.vhost),
          },
        };
        return this.postService(
          {
            service: SERVICE.drumate.update_settings,
            settings: opt,
            hub_id: Visitor.id,
          },
          { async: 1 }
        ).then((data) => {
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
    const wp = Platform.get("wallpaper");

    let api = {
      service: SERVICE.media.get_by_type,
      page: 1,
      type: _a.image,
      nid: wp.path,
      sort: _a.rank,
      order: "desc",
      vhost: wp.vhost,
      timer: 2000,
    };
    return api;
  }
}

__window_wallpaper_settings.initClass();
module.exports = __window_wallpaper_settings;

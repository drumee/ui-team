const { filesize } = require("@drumee/ui-essentials");

const __window_interact = require("../interact");
const UploadProgressWindow = require("../upload-progress");

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
  }

  /**
   *
   */
  static initClass() {
    this.prototype.isFolder = 1;
    this.prototype.acceptMedia = 1;
    this.prototype.figName = "window_wallpaper_settings";
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
    this.model.atLeast({
      maxSize: 10000000
    });
    this.acceptMedia = 1;
    this.isWallpaperSettings = 1;
    this._currentSeetings = { ...Visitor.get(_a.settings) };
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
   * Send file that has been selected. 
   * The file will only be actually applied as bg once the validation buton fired
   */
  sendFile(file) {
    if (!file || !(file instanceof File)) {
      this.warning("Invalid file for upload", file);
      return;
    }

    /** Create a folder where to store the wallpaper */
    this.postService(SERVICE.media.make_dir, {
      hub_id: Visitor.id,
      nid: Visitor.get(_a.home_id),
      ownpath: `/${LOCALE.DESKTOP_WALLPAPER}`,
      metadata: { folder_type: "wallpapers" }
    }).then((data) => {
      if (!data || !data.nid) {
        this.warning("Failed to create wallpaper folder", data);
        return;
      }

      let {
        nid,
        home_id,
        hub_id
      } = data;

      /** Append media uploader queue */
      this.append({
        kind: "media_uploader",
        mode: _a.blank,
        uiHandler: [this],
      });
      let queue = this.children.last();
      if (!queue) {
        this.warning("Failed to create uploader queue");
        return;
      }
      // Show upload progress window
      UploadProgressWindow.getOrCreate().then((progressWindow) => {
        if (progressWindow) {
          // Add file to upload progress window
          progressWindow.addUploadItem(file, queue);
          
          // Track progress
          queue.on(_e.progress, (progressPercent) => {
            // Calculate speed (simplified - could be improved with time tracking)
            const speed = file.size ? (file.size * progressPercent / 100) / 1000 : 0; // bytes per second (rough estimate)
            
            progressWindow.updateProgress(file.name, progressPercent, speed);
          });
        }
      });

      queue.on(_e.progress, (e) => {
        this.ensurePart("uploader-progress").then((p) => {
          p.el.style.width = `${e}%`;
          p.el.dataset.state = `1`;
        })
      })

      queue.once("upload:response", (data) => {
        const { nid, hub_id } = data;
        
        // Mark upload as completed in progress window
        UploadProgressWindow.getOrCreate().then((progressWindow) => {
          if (progressWindow) {
            progressWindow.completeUpload(file.name, { nid, hub_id });
          }
        });
        
        data = {
          settings: {
            wallpaper: { nid, hub_id }
          }
        }
        this.mset({ nid, hub_id });
        this.applySelectedImage(this, 1)
      });

      // Listen for destroy event - upload queue is destroyed when upload completes
      queue.once(_e.destroy, () => {
        this.goodbye()
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
      }

      queue.add(args);

    }).catch((error) => {
      this.warning("Failed to setup upload", error);
    });
  }

  /**
   * Insert media files
   */
  insertMedia(items, options = {}) {
    if (!items || !items.length) return;
    let fileEntry = items[0].mget(_a.file);
    fileEntry.file((file) => {
      this.prepareFile(file);
    });
    return;
  }

  /**
   * 
   */
  prepareFile(file) {
    if (!file || !file.size || !file.type || !file.type.startsWith('image/')) return;
    this._pendingFile = file;
    let error = file.size > this.mget('maxSize') ? 1 : 0;

    this.ensurePart("file-size-text").then((p) => {
      let content = `${LOCALE.MAX_FILE_SIZE_X.format(filesize(this.mget('maxSize')))}`;
      if (error) {
        content = `${content} (${filesize(file.size)})`;
      }
      p.set({ content });
      p.el.dataset.error = error;
      this._error = error;
    }).catch((err) => {
    });
    if (error) return
    this.ensurePart("uploader").then((uploaderPart) => {
      if (uploaderPart && uploaderPart.el) {
        const url = URL.createObjectURL(file);
        uploaderPart.el.style.backgroundImage = `url(${url})`;

        // Clean up old object URL when new one is set
        if (this._previewObjectUrl) {
          URL.revokeObjectURL(this._previewObjectUrl);
        }
        this._previewObjectUrl = url;
      }
    }).catch((err) => {
    });

  }


  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
    this.raise();
    // Handle events only on uploader container

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
        child.ensureElement().then(() => {
          child.feed(require("./skeleton/content").default(this));
        });
        break;
      case _a.uploader:
        child.ensureElement().then(() => {
          child.$el.droppable({
            tolerance: "touch",
            over: this.mediaDragOver,
            out: this.mediaDragLeave,
            drop: this.mediaDrop,
            greedy: true
          });
          let { nid, hub_id } = Visitor.wallpaper() || {};
          if (!nid || !hub_id) return;
          let url = `${bootstrap().endpointPath}file/slide/${nid}/${hub_id}`;
          child.el.style.backgroundImage = `url(${url})`;
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

    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();

      case "apply-new-bg":
        if (this._error) return;
        if (this._pendingFile) {
          return this.sendFile(this._pendingFile)
        }
        return this.goodbye();

      case "cancel-set-bg":
        this.restoreSettings().then(() => {
          this.goodbye();
        }).catch(() => {
          this.goodbye();
        });
        return;

      case "set-bg-color":
        this.applySelectedColor(cmd);

      case "set-wallpaper":
        return this.applySelectedImage(cmd);

      case "upload-image":
        this.ensurePart('fileselector').then((p) => {
          p.open((e) => {
            // Handle file selection
            const files = e.target.files || [];
            if (!files.length) return
            this.prepareFile(files[0])
          })
        })
        break;


      default:
        return super.onUiEvent(cmd, args);
    }
  }


  /**
   * 
   */
  getCurrentApi() {
    let api = {
      service: SERVICE.desk.my_wallpapers,
      page: 1,
      hub_id: Visitor.id,
      timer: 2000,
    };
    return api;
  }


  /**
   * 
   * @param {*} cmd 
   */
  applySelectedImage(cmd, quit = 0) {
    // Set wallpaper immediately when clicking on image in gallery
    const { nid, hub_id } = cmd.model.toJSON()
    const opt = {
      wallpaper: { nid, hub_id }
    };
    this._previousSettings = opt;
    this._error = null;
    this._pendingFile = null;
    return this.postService({
      service: SERVICE.drumate.update_settings,
      settings: opt,
      hub_id: Visitor.id,
    }).then((data) => {
      this.triggerHandlers({ data, service: "set-wallpaper-image" });
      if (quit) {
        this.goodbye()
      }
    });

  }

  /**
   * Apply selected color as wallpaper
   */
  applySelectedColor(cmd) {
    const name = cmd.mget(_a.name);
    const { borderColor, backgroundColor } = window.getComputedStyle(cmd.el);
    this._error = null;
    this._pendingFile = null;
    const opt = {
      wallpaper: {
        nid: "",
        hub_id: "",
        vhost: "",
        color: { name, primary: backgroundColor, secondary: borderColor },
      },
    };
    this._previousSettings = opt;
    this.postService({
      service: SERVICE.drumate.update_settings,
      settings: opt,
      hub_id: Visitor.id,
    }).then((data) => {
      this.triggerHandlers({ data, service: "set-wallpaper-color" });
    })
      .catch((error) => {
        this.error("Failed to update wallpaper color", error);
      });
  }

  /**
   * 
   */
  restoreSettings() {
    const opt = this._currentSeetings;
    this._error = null;
    this._pendingFile = null;
    return this.postService({
      service: SERVICE.drumate.update_settings,
      settings: opt,
      hub_id: Visitor.id,
    }).then((data) => {
      let service = "set-wallpaper-image";
      if (opt.wallpaper.color) service = "set-wallpaper-color";
      this.triggerHandlers({ data, service })
    })
      .catch((error) => {
        this.error("Failed to update wallpaper color", error);
      });
  }
}

__window_wallpaper_settings.initClass();
module.exports = __window_wallpaper_settings;

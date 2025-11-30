const { filesize, dataTransfer } = require("core/utils");

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
    // this.fileDragLeave = this.fileDragLeave.bind(this);
    // this.fileDragOver = this.fileDragOver.bind(this);
    // this.fileDrop = this.fileDrop.bind(this);

    // Add state for selected color and color definitions
    // this.selectedColor = null;
    // this.colors = [
    //   { name: "gray", value: "#ebecf0" },
    //   { name: "red", value: "#ff5779" },
    //   { name: "pink", value: "#ff65d5" },
    //   { name: "blue", value: "#2aaaff" },
    //   { name: "green", value: "#34d382" },
    //   { name: "yellow", value: "#ffe50d" },
    //   { name: "orange", value: "#ffa332" },
    // ];

    // Bind the color selection handler
    // this.handleColorSelect = this.handleColorSelect.bind(this);
    // this.mediaDragOver = this.mediaDragOver.bind(this);
    // this.mediaDragLeave = this.mediaDragLeave.bind(this);
    // this.mediaDrop = this.mediaDrop.bind(this);
    // this._selectedColor = null;
    // this._selectedWallpaper = null;
  }

  /**
   *
   */
  static initClass() {
    this.prototype.isFolder = 1;
    this.prototype.acceptMedia = 1;
    this.prototype.figName = "window_wallpaper_settings";
    // this.prototype.events = {
    //   dragenter: "fileDragEnter",
    //   dragover: "fileDragOver",
    //   dragleave: "fileDragLeave",
    //   drop: "fileDrop",
    // };
    // Don't bind events at window level - handle only on uploader area
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
   * Handle media drag over on uploader area
   */
  // No need since we are using window features
  // mediaDragOver(e, ui) {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   const uploader = this.findPart('uploader');
  //   if (uploader && uploader.el) {
  //     uploader.el.dataset.over = _a.on;
  //   }
  //   if (e.originalEvent && e.originalEvent.dataTransfer) {
  //     e.originalEvent.dataTransfer.dropEffect = 'copy';
  //   }
  //   return false;
  // }

  /**
   * Handle media drag leave from uploader area
   */
  // No need since we are using window features
  // mediaDragLeave(e, ui) {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   const uploader = this.findPart('uploader');
  //   if (uploader && uploader.el) {
  //     uploader.el.dataset.over = _a.off;
  //   }
  //   return false;
  // }

  /**
   * Handle media drop on uploader area
   */
  // No need since we are using window features
  // mediaDrop(e, ui) {
  //   this.debug("mediaDrop", e, ui);
  //   e.stopPropagation();
  //   e.preventDefault();

  //   const uploader = this.findPart('uploader');
  //   if (uploader && uploader.el) {
  //     uploader.el.dataset.over = _a.off;
  //   }

  //   const originalEvent = e.originalEvent || e;
  //   const transfer = dataTransfer(originalEvent);
  //   const files = transfer.files || [];
  //   this.debug("mediaDrop extracted", transfer, files);

  //   if (!files || files.length === 0) {
  //     this.debug("mediaDrop: no files", e);
  //     return false;
  //   }

  //   if (files.length > 1) {
  //     this.warning("Uploading files to wallpaper is limited to one single file at a time.");
  //     return false;
  //   }

  //   let file = files[0];
  //   if (!file) {
  //     this.debug("mediaDrop: invalid file", file);
  //     return false;
  //   }

  //   // Handle FileEntry - convert to File
  //   if (file.isFile && _.isFunction(file.file)) {
  //     file.file((fileObj) => {
  //       if (fileObj) {
  //         this.updateFileSizeText(fileObj);
  //         this.previewFileImage(fileObj);
  //       } else {
  //         this.warning("Failed to read file from FileEntry");
  //       }
  //     });
  //     return false;
  //   }

  //   // Handle regular File object
  //   if (!(file instanceof File)) {
  //     this.debug("mediaDrop: file is not a File object", file);
  //     return false;
  //   }

  //   this.updateFileSizeText(file);
  //   this.previewFileImage(file);
  //   return false;
  // }


  /**
   * Send file that has been selected. 
   * The file will only be actually applied as bg once the validation buton fired
   */
  sendFile(file) {
    this.debug("sendFile wallpaper settings", file);
    if (!file || !(file instanceof File)) {
      this.warning("Invalid file for upload", file);
      return;
    }

    /** Create a folder where to store the wallpaper */
    this.postService(SERVICE.media.make_dir, {
      hub_id: Visitor.id,
      nid: Visitor.get(_a.home_id),
      ownpath: `/${LOCALE.DESKTOP_WALLPAPER}`,
    }).then((data) => {
      this.debug("make_dir response", data);
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
      this.debug("Upload queue", queue);
      if (!queue) {
        this.warning("Failed to create uploader queue");
        return;
      }
      queue.on(_e.progress, (e) => {
        this.ensurePart("uploader-progress").then((p) => {
          p.el.style.width = `${e}%`;
          p.el.dataset.state = `1`;
        })
      })

      queue.once("upload:response", (data) => {
        this.debug("Upload response - got authorization", data);
        const { nid, hub_id } = data;
        data = {
          settings: {
            wallpaper: { nid, hub_id }
          }
        }
        this.mset({nid,hub_id});
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
      this.debug("Could not update file size text", err);
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
      this.debug("Could not preview file image", err);
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
    this.debug(
      `__window_wallpaper_settings onUiEvent service=${service}`,
      cmd,
      this
    );

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
        return this.restoreSettings();

      // case "apply-new-bg":
      //   return this._applyWallpaper(cmd);

      case "set-bg-color":
        this.applySelectedColor(cmd);

      case "set-wallpaper":
        return this.applySelectedImage(cmd);

      // this.handleColorSelect(cmd);
      // Extract color information from the clicked element
      // const colorElement = cmd.el || cmd.target;
      // const colorClass = Array.from(colorElement.classList).find((cls) =>
      //   cls.startsWith("color-")
      // );
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

      // case "select-color":
      //   // Handle color selection
      //   const selectedColor = cmd.el.dataset.color;
      //   if (selectedColor) {
      //     this._selectedColor = selectedColor;
      //     this._selectedWallpaper = null; // Clear wallpaper when color is selected

      //     // Update visual feedback - remove selection from all swatches
      //     const swatches = this.el.querySelectorAll(`.${this.fig.family}__color-swatch`);
      //     swatches.forEach((swatch) => {
      //       swatch.dataset.selected = "0";
      //     });

      //     // Mark selected swatch
      //     cmd.el.dataset.selected = "1";

      //     this.debug("Color selected", selectedColor);
      //   }
      //   break;

      // case "set-wallpaper":
      //   // Store wallpaper selection (but don't apply yet - wait for Apply button)
      //   this._selectedWallpaper = {
      //     nid: cmd.model.get(_a.nodeId),
      //     hub_id: cmd.model.get(_a.hub_id) || cmd.model.get(_a.ownerId),
      //     vhost: cmd.model.get(_a.vhost)
      //   };
      //   this._selectedColor = null; // Clear color when wallpaper is selected

      //   // Update visual feedback - remove selection from all color swatches
      //   const swatches = this.el.querySelectorAll(`.${this.fig.family}__color-swatch`);
      //   if (swatches) {
      //     swatches.forEach((swatch) => {
      //       swatch.dataset.selected = "0";
      //     });
      //   }

      //   this.debug("Wallpaper selected", this._selectedWallpaper);
      //   break;

      //   // if (colorClass) {
      //   //   const colorName = colorClass.replace("color-", "");
      //   //   const colorObj = this.colors.find((c) => c.name === colorName);
      //   //   if (colorObj) {
      //   //     this.handleColorSelect(colorObj.value, colorObj.name);
      //   //   }
      //   // }
      //   return;

      default:
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   * Apply wallpaper or color changes
   */
  // _applyWallpaper(cmd) {
  //   this.debug("_applyWallpaper", cmd, this._selectedColor, this._selectedWallpaper);

  //   let opt = {
  //     wallpaper: {}
  //   };

  //   // If color is selected, set color
  //   if (this._selectedColor) {
  //     opt.wallpaper = {
  //       nid: "",
  //       hub_id: "",
  //       vhost: "",
  //       color: this._selectedColor
  //     };
  //     this._selectedWallpaper = null; // Clear wallpaper selection if color is set
  //   }
  //   // If wallpaper is selected (from gallery click), use it
  //   else if (this._selectedWallpaper) {
  //     opt.wallpaper = {
  //       nid: this._selectedWallpaper.nid,
  //       hub_id: this._selectedWallpaper.hub_id,
  //       vhost: this._selectedWallpaper.vhost
  //     };
  //   }

  //   // Apply settings
  //   return this.postService({
  //     service: SERVICE.drumate.update_settings,
  //     settings: opt,
  //     hub_id: Visitor.id
  //   }, { async: 1 }).then((data) => {
  //     Visitor.set({ settings: JSON.parse(data.settings) });

  //     // Update desk module with color/wallpaper
  //     if (this._selectedColor) {
  //       // Apply color to desk
  //       if (window.Desk && window.Desk.el) {
  //         window.Desk.el.dataset.wallpaper = "0";
  //         window.Desk.el.dataset.color = this._selectedColor;
  //         window.Desk.el.style.backgroundColor = this._selectedColor;
  //         // Apply color to main element too
  //         const mainEl = window.Desk.el.querySelector('.desk-module__main');
  //         if (mainEl) {
  //           mainEl.dataset.wallpaper = "0";
  //           mainEl.dataset.color = this._selectedColor;
  //           mainEl.style.backgroundColor = this._selectedColor;
  //         }
  //         // Update internal state
  //         window.Desk._wallpaper = 0;
  //         window.Desk._color = this._selectedColor;
  //       }
  //     } else if (this._selectedWallpaper) {
  //       uiRouter.setWallpaper(Visitor.wallpaper());
  //       // Clear color if wallpaper is set
  //       if (window.Desk && window.Desk.el) {
  //         window.Desk.el.style.backgroundColor = '';
  //         const mainEl = window.Desk.el.querySelector('.desk-module__main');
  //         if (mainEl) {
  //           mainEl.style.backgroundColor = '';
  //         }
  //         window.Desk._color = null;
  //       }
  //     }

  //     // Restart desk to apply changes
  //     if (window.Desk && window.Desk.restart) {
  //       window.Desk.restart();
  //     }

  //     // Close window after applying
  //     return this.goodbye();
  //   });
  // }

  /**
   * @param {*} type
   */
  getCurrentApi(type) {
    const wp = Platform.get('wallpaper');

    if (!wp) {
      this.warning("Wallpaper platform config not found");
      return null;
    }

    // Use nid if available, otherwise fallback to path
    const nid = wp.nid || wp.path;

    if (!nid) {
      this.warning("Wallpaper path/nid not found in platform config", wp);
      return null;
    }

    let api = {
      service: SERVICE.media.get_by_type,
      page: 1,
      type: _a.image,
      nid: nid,
      sort: _a.rank,
      order: "desc",
      vhost: wp.vhost,
      timer: 2000,
    };
    return api;
  }

  /**
   * Handle color selection
   */
  // handleColorSelect(colorValue, colorName) {
  //   this.debug("handleColorSelect", colorValue, colorName);

  //   // Update the selected color
  //   this.selectedColor = {
  //     value: colorValue,
  //     name: colorName,
  //   };

  //   // Update UI to highlight selected color
  //   // this.updateColorSelectionUI(); ==> No need when using radio

  //   // Automatically apply the selected color
  //   this.applySelectedColor();
  // }

  /**
   * Update UI to show selected color
   */
  // updateColorSelectionUI() {
  //   const colorsWrapper = this.findPart("colors-wrapper");
  //   if (!colorsWrapper || !colorsWrapper.el) return;

  //   // Remove selected class from all colors
  //   const colorElements = colorsWrapper.el.querySelectorAll(".item");
  //   colorElements.forEach((element) => {
  //     element.classList.remove("selected");
  //     element.dataset.selected = _a.off;
  //   });

  //   // Add selected class to the chosen color
  //   const selectedElement = colorsWrapper.el.querySelector(
  //     `.color-${this.selectedColor.name}`
  //   );
  //   if (selectedElement) {
  //     selectedElement.classList.add("selected");
  //     selectedElement.dataset.selected = _a.on;
  //   }
  // }

  /**
   * 
   * @param {*} cmd 
   */
  applySelectedImage(cmd, quit=0) {
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
      this.debug("Wallpaper image updated successfully", data);
      this.triggerHandlers({ data, service: "set-wallpaper-image" });
      if(quit){
        this.goodbye()
      }
    });

  }

  /**
   * Apply selected color as wallpaper
   */
  applySelectedColor(cmd) {
    // if (!this.selectedColor) return;
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
      this.debug("Wallpaper color updated successfully", data);
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
    this.postService({
      service: SERVICE.drumate.update_settings,
      settings: opt,
      hub_id: Visitor.id,
    }).then((data) => {
      this.debug("Wallpaper color updated successfully", data);
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

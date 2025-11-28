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

    // Add state for selected color and color definitions
    this.selectedColor = null;
    this.colors = [
      { name: "gray", value: "#ebecf0" },
      { name: "red", value: "#ff5779" },
      { name: "pink", value: "#ff65d5" },
      { name: "blue", value: "#2aaaff" },
      { name: "green", value: "#34d382" },
      { name: "yellow", value: "#ffe50d" },
      { name: "orange", value: "#ffa332" },
    ];

    // Bind the color selection handler
    this.handleColorSelect = this.handleColorSelect.bind(this);
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

    // Set default color (first color in array)
    if (this.colors.length > 0 && !this.selectedColor) {
      const defaultColor = this.colors[0];
      this.selectedColor = {
        value: defaultColor.value,
        name: defaultColor.name,
      };

      // Update UI after DOM has rendered
      setTimeout(() => {
        this.updateColorSelectionUI();
      }, 100);
    }
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
        // Extract color information from the clicked element
        const colorElement = cmd.el || cmd.target;
        const colorClass = Array.from(colorElement.classList).find((cls) =>
          cls.startsWith("color-")
        );

        if (colorClass) {
          const colorName = colorClass.replace("color-", "");
          const colorObj = this.colors.find((c) => c.name === colorName);
          if (colorObj) {
            this.handleColorSelect(colorObj.value, colorObj.name);
          }
        }
        return;

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

  /**
   * Handle color selection
   */
  handleColorSelect(colorValue, colorName) {
    this.debug("handleColorSelect", colorValue, colorName);

    // Update the selected color
    this.selectedColor = {
      value: colorValue,
      name: colorName,
    };

    // Update UI to highlight selected color
    this.updateColorSelectionUI();

    // Automatically apply the selected color
    this.applySelectedColor();
  }

  /**
   * Update UI to show selected color
   */
  updateColorSelectionUI() {
    const colorsWrapper = this.findPart("colors-wrapper");
    if (!colorsWrapper || !colorsWrapper.el) return;

    // Remove selected class from all colors
    const colorElements = colorsWrapper.el.querySelectorAll(".item");
    colorElements.forEach((element) => {
      element.classList.remove("selected");
      element.dataset.selected = _a.off;
    });

    // Add selected class to the chosen color
    const selectedElement = colorsWrapper.el.querySelector(
      `.color-${this.selectedColor.name}`
    );
    if (selectedElement) {
      selectedElement.classList.add("selected");
      selectedElement.dataset.selected = _a.on;
    }
  }

  /**
   * Apply selected color as wallpaper
   */
  applySelectedColor() {
    if (!this.selectedColor) return;

    const opt = {
      wallpaper: {
        nid: "",
        hub_id: "",
        vhost: "",
        color: this.selectedColor.value,
      },
    };

    this.postService(
      {
        service: SERVICE.drumate.update_settings,
        settings: opt,
        hub_id: Visitor.id,
      },
      { async: 1 }
    )
      .then((data) => {
        this.debug("Wallpaper color updated successfully", data);
        Visitor.set({ settings: JSON.parse(data.settings) });
        uiRouter.setWallpaper(Visitor.wallpaper());
      })
      .catch((error) => {
        this.error("Failed to update wallpaper color", error);
      });
  }
}

__window_wallpaper_settings.initClass();
module.exports = __window_wallpaper_settings;

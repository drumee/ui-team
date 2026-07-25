const { filesize } = require("@drumee/ui-essentials");
const MAX_BLOB_SIZE = 100000000;

class settings_export_data extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._selected = new Set();
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
  }

  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
    this._loadSizes();
  }

  /**
   * Real byte sizes per category, so the dialog states what the download will
   * actually contain instead of the fixed placeholders it used to print. Fire
   * and forget: the dialog is usable while this is in flight (each row shows a
   * dash), and a failure just leaves the dashes rather than blocking the export.
   */
  _loadSizes() {
    this.fetchService(SERVICE.drumate.backup_size, { hub_id: Visitor.id })
      .then((data) => {
        if (!data || this.isDestroyed()) return;
        this._sizes = data;
        this.feed(require("./skeleton").default(this));
      })
      .catch((e) => {
        this.warn("export-data: backup_size failed", e);
      });
  }

  toggleSelection(key) {
    if (this._selected.has(key)) this._selected.delete(key);
    else this._selected.add(key);
    this.feed(require("./skeleton").default(this));
  }

  cancel() {
    this.triggerHandlers({ service: "export-data-cancel" });
    this.goodbye();
  }

  handleDownload(data) {
    if (this.mget("zipid") !== data.zipid) return;
    if (this._isDownloading === data.zipid) return;
    let progress = this.getPart("progress");
    if (data.exit === 0) {
      if (progress && !progress.isDestroyed()) {
        progress.suppress();
      }
      this._isDownloading = data.zipid;
      this._pendingBackup = false;
      let { svc, keysel } = bootstrap();
      let hub_id = this.mget(_a.hub_id);
      let nid = this.mget(_a.nid) || 0;
      let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${data.zipid}&keysel=${keysel}&zipname=${data.zipname}`;
      // The `download` attribute OVERRIDES the server's
      // Content-Disposition filename, and data.zipname arrives without a
      // suffix ("Snake1-__drumee.in"). The browser therefore saved an
      // extension-less file that the OS could not open — the archive was
      // there, but to the user "the download didn't work". Re-attach .zip.
      const zipname = data.zipname || "backup";
      let a = document.createElement("a");
      a.href = url;
      a.download = /\.zip$/i.test(zipname) ? zipname : `${zipname}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Warn on a big archive. The size has to come off the completion event:
      // drumate.backup answers {zipid, status:'queued'} before anything is
      // compressed, so the old `this._zipsize = data.size` was always 0 and
      // this warning never fired once — not even for the 585 MB archive this
      // was reproduced with, leaving the user staring at a screen that looked
      // like nothing had happened.
      const zipsize = data.size || data.zipsize || this._zipsize || 0;
      if (zipsize > MAX_BLOB_SIZE) {
        Wm.alert(LOCALE.DOWNLOAD_LONG_TIME.format(a.download, filesize(zipsize)));
      }
      return;
    }

    if (data.exit > 0) {
      this._pendingBackup = false;
      if (progress && !progress.isDestroyed()) {
        progress.feed(
          Skeletons.Note({
            className: `${this.fig.family}__progress-message`,
            content: "An error has occurred",
          })
        );
      }
      return;
    }

    if (data.message === "BEING_CREATED" && progress && !progress.isDestroyed()) {
      progress.el.style.width = `${data.progress}%`;
    }
  }

  onWsMessage(svc, data, options = {}) {
    if (data && data.zipid) {
      this.handleDownload(data);
    }
  }

  downloadSelected() {
    if (!this._selected.size) {
      this.ensurePart("download-button").then((p) => {
        p.setState(1);
      });
      return;
    }
    this.postService(SERVICE.drumate.backup, {
      hub_id: Visitor.id,
      flags: this._selected.keys().toArray(),
    })
      .then((data) => {
        if (!data.zipid) {
          this.warn("Got empty data");
          return;
        }
        this.mset({
          zipid: data.zipid,
          hub_id: Visitor.id,
          nid: data.nid || 0,
        });
        this._zipsize = data.size || 0;
        this.ensurePart("message").then((part) => {
          part.feed(require("./skeleton/progress").default(this));
        });
        this.ensurePart("download-button").then((p) => {
          p.setState(1);
        });
      })
      .catch((e) => {
        this.warn("downloadSelected: backup failed", e);
      });
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "export-cancel":
        return this.cancel();

      case "export-toggle-item":
        return this.toggleSelection(cmd.mget("item_key"));

      case "export-download":
        return this.downloadSelected();

      case "export-download-all":
        return this.downloadAll();

      default:
        return;
    }
  }

  downloadAll() {
    // One archive at a time. Every click spawns a server-side compression of
    // the entire account (585 MB in testing); with no feedback for the minute
    // or two that takes, an impatient second click used to start a second one.
    if (this._pendingBackup) return;
    this._pendingBackup = true;
    this.postService(SERVICE.drumate.backup, {
      hub_id: Visitor.id,
      flags: ["files", "chat", "workspace", "activity"],
    })
      .then((data) => {
        if (!data.zipid) {
          this.warn("Got empty data");
          return;
        }
        this.mset({
          zipid: data.zipid,
          hub_id: Visitor.id,
          nid: data.nid || 0,
        });
        this._zipsize = data.size || 0;
        this.ensurePart("message").then((part) => {
          part.feed(require("./skeleton/progress").default(this));
        });
      })
      .catch((e) => {
        this._pendingBackup = false;
        this.warn("downloadAll: backup failed", e);
        if (Wm && Wm.alert) {
          Wm.alert(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong. Please try again.");
        }
      });
  }
}

module.exports = settings_export_data;

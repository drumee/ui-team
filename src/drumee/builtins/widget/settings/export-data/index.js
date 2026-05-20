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
      let { svc, keysel } = bootstrap();
      let hub_id = this.mget(_a.hub_id);
      let nid = this.mget(_a.nid) || 0;
      let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${data.zipid}&keysel=${keysel}&zipname=${data.zipname}`;
      let a = document.createElement("a");
      a.href = url;
      a.download = data.zipname || "backup.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (this._zipsize > MAX_BLOB_SIZE) {
        Wm.alert(LOCALE.DOWNLOAD_LONG_TIME.format(data.zipname, filesize(this._zipsize)));
      }
      return;
    }

    if (data.exit > 0) {
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
        this.warn("downloadAll: backup failed", e);
      });
  }
}

module.exports = settings_export_data;

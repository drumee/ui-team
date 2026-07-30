const { colorFromName, filesize } = require("@drumee/ui-essentials");
class __account_data extends DrumeeMFS {
  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    require('./skin');
    this._labels = {
      hub: LOCALE.MY_HUBS,
      folder: LOCALE.FOLDERS,
      video: LOCALE.VIDEOS,
      image: LOCALE.PHOTOS,
      audio: LOCALE.MUSICS,
      document: LOCALE.DOCUMENTS,
      stylesheet: LOCALE.STYLESHEET,
      script: LOCALE.PLUGGINS,
      vector: LOCALE.SVG,
      web: LOCALE.WEBPAGE,
      text: LOCALE.TEXT,
      other: LOCALE.OTHER,
      _misc_: LOCALE.MISC,
    };
    this.bindEvent(_e.media, _a.channel);
    try {
      this.quota = JSON.parse(Visitor.profile().quota);
    } catch (e) {
      this.quota = { disk: 0, hub: 0 }
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.declareHandlers();
    this.feed(require('./skeleton')(this));
    this.fetchService({
      service: SERVICE.drumate.data_usage,
      hub_id: Visitor.id
    }).then((data) => {
      this._data = data;
      this._display(data, " ");
    });

    this._token = Visitor.parseModuleArgs().token;
    this._step = 1;
  }

  /**
   * 
   * @param {*} s 
   */
  gotoStep(s) {
    for (let c of this.__stepsBox.children.toArray()) {
      if (c.getIndex() == (s - 1)) {
        c.setState(1);
        c.children.forEach((k) => {
          k.setState(1);
        })
      } else {
        c.setState(0);
        c.children.forEach((k) => {
          k.setState(0);
        })
      }
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args) {
    this._mode = null;
    switch (cmd.get(_a.service)) {
      case "close-dialog":
        this.closeModal();
        break;

      case _e.delete:
        this.openMdal(require('./skeleton/deletion')(this));
        break;

      case 'resend-otp':
        this.fetchService(SERVICE.drumate.get_otp, { hub_id: Visitor.id }).then((data) => {
          this._data = data;
        });
        break;

      case "quick-delete":
        this.openMdal(require('./skeleton/deletion/quick-delete')(this));
        this.readOtp();
        break;

      case 'prompt-otp':
        this.__actionButton.mset({
          service: 'request-delete'
        });
        this.readOtp();
        break;

      case 'prompt-otp':
        this.openMdal(require('./skeleton/deletion/confirm')(this));
        break;

    }
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "data-chart":
        return this._chart = child;
    }
  }


  /**
   * 
   * @param {*} e 
   * @returns 
   */
  onServerComplain(e) {
    return this.warn("GOT ERROR. TO BE HANDLED", e);
  }

  /**
   * 
   */
  showResendOtp() {
    this.__noCode.el.dataset.mode = _a.open;
  }

  /**
   * 
   */
  readOtp() {
    this.gotoStep(3);
    this.fetchService(SERVICE.drumate.get_otp, { hub_id: Visitor.id }).then((data) => {
      this._data = data;
      this.__content.feed(require('./skeleton/deletion/otp')(this));
      _.delay(this.showResendOtp.bind(this), 5000);
    }).catch(() => {
      if (data.rejected) {
        Wm.alert(LOCALE.INVALID_LINK);
        return;
      }
    });
  }

  /**
   * 
   */
  openMdal(opt) {
    this.mget('logicalParent').warning(opt, this);
  }

  /**
   * 
   */
  closeModal(opt) {
    this.mget('logicalParent').__wrapperOverlay.softClear()
  }

  /**
   * 
   * @param {*} data 
   * @param {*} title 
   * @param {*} subtitle 
   */
  _display(data) {
    let { quota, usage } = data;
    if (quota) Visitor.set({ quota });
    if (usage) Visitor.set({ disk_usage: usage });
    // `storage` is an alias the get_quota PROCEDURE adds; the FUNCTION that
    // feeds desk.get_env sends the underlying `disk`. Fall back so this works
    // against a deployment whose schema has not caught up.
    let max = Visitor.quota("storage") || Visitor.quota("disk");
    // Unlimited entitlement — the claim-reward prize (5 years). $.disk still
    // carries the BIGINT sentinel so the arithmetic below stays safe, but it
    // must not reach the screen: the available/used pie would be a 100% slice
    // with an invisible sliver, and the total would read "9.22 EB".
    const _q = Visitor.quota() || {};
    const unlimited = _q.unlimited === true || _q.unlimited === 1 || _q.unlimited === "1";
    let details = [];
    let du = Visitor.diskUsage();
    for (let k in du) {
      if (/^(personal_.+|hub_.+|total)$/.test(k)) continue;
      details.push({
        label: this._labels[k] || k,
        value: du[k],
        color: colorFromName(k)
      })
    }

    // `used` is NO LONGER CLAMPED to `max`.
    //
    // It used to be, so a user storing 14 GB against a 5 GB allowance was shown
    // a tidy "5 GB / 5 GB" at 100% — which reads as "exactly full" when the
    // truth is "9 GB over, and uploads are refused". That is the screen someone
    // lands on to work out why an upload just failed, and it told them nothing
    // was wrong.
    //
    // Being over quota is not a rare state: the 20 GB -> 5 GB free migration
    // (schemas 2026-07-24-migrate-free-to-new-allowance.sql) deliberately
    // GRANDFATHERED accounts already above the new allowance, so those users are
    // over it today. Claim-reward terms lapsing five years out land in the same
    // place. Both deserve an honest number.
    let used = Visitor.diskUsed();
    let over = !unlimited && max > 0 && used > max;
    // Still floored at 0 — a negative slice is meaningless — but no longer
    // capped, so the chart and the total can show the real figure.
    let available = Math.max(0, max - used);
    let details_chart;
    if (details.length) {
      details_chart = {
        kind: KIND.chart.pie,
        content: _.sortBy(details, _a.value),
        labels: {
          mainLabel: {
            fontSize: 12,
            color: "black",
            font: "Roboto-Light,sans-serif"
          }
        },

        header: {
          title: {
            text: LOCALE.FILE_TYPE,
            fontSize: 17,
            font: "Roboto-Light,sans-serif",
            color: "black"
          },
          location: "pie-center"
        }
      };
    }else{
      details_chart = require('./skeleton/no-data-yet')
    }


    // On an unlimited entitlement there is no "available" to plot against: the
    // slice would be the whole circle and what the user actually stores would
    // be a hairline. Over quota there is no available space either — a slice of
    // `max - used` would be negative. Both cases drop the slice and leave the
    // pie as the used breakdown alone.
    let content = (unlimited || over) ? [] : [{
      label: LOCALE.SPACE_AVAILABLE,
      value: available,
      color: colorFromName(LOCALE.SPACE_AVAILABLE),
    }];
    if (used) {
      content.push({
        label: LOCALE.SPACE_USED,
        value: used,
        color: colorFromName(LOCALE.SPACE_USED),
      })
    }
    const usage_chart = {
      kind: KIND.chart.pie,
      content,
      labels: {
        mainLabel: {
          fontSize: 12,
          color: "black",
          font: "Roboto-Light,sans-serif"
        }
      },

      header: {
        title: {
          text: LOCALE.DATA_USAGE,
          fontSize: 17,
          font: "Roboto-Light,sans-serif",
          color: "black"
        },
        location: "pie-center"
      }
    };
    // Over quota, the total says so rather than reading as a coincidence that
    // used and max happen to match.
    this.__totalSize.set({
      content: `${LOCALE.DATA_USAGE} ${filesize(used)}/${
        unlimited ? (LOCALE.UNLIMITED || "Unlimited") : filesize(max)}`
        + (over ? ` — ${LOCALE.UPLOADS_PAUSED || "uploads paused"}` : "")
    });


    this.ensurePart("ref-chart").then((p) => {
      p.feed([usage_chart, details_chart]);
    })
  }
  /**
   * 
   */
  downloadBackup() {
    if (this._isDownloading) return;
    this.__progress.setLabel(this._downloadData.zipname);
    this.__actionButton.set({
      content: LOCALE.CANCEL,
      service: 'abort-download',
    });
    this.once(_e.eod, () => {
      this.__progress.setLabel(LOCALE.YOUR_DATA.printf(LOCALE.HAS_BEEN_SAVED));
      this.postService({ service: SERVICE.media.zip_release, id: this._downloadData.zipid });
      if (this._mode != _a.backup) {
        this.__actionButton.set({
          content: LOCALE.CONTINUE,
          service: 'prompt-otp',
          state: 0
        });
        this.__checkData.setState(1);
      } else {
        this.__actionButton.set({
          content: LOCALE.CLOSE,
          service: 'close-dialog',
        });

      }
    });
    this._isDownloading = 1;
    this.download_zip({ ...this._downloadData, progress: this.__progress, backup: 1 })
      .then(() => {
      })
      .catch((e) => {
        this.warn("GOT ERRO WHILE DOWNLOADING", e);
        if (/aborted/.test(e)) {
          this.__progress.setLabel(LOCALE.CANCELED);
          this.closeModal();
        } else {
          this.__progress.setLabel(e);
        }
        this.__actionButton.set({
          content: LOCALE.CLOSE,
          service: _e.close,
        });
      });
  }

  /**
   * 
   */
  backupReady(data) {
    this.mset(_a.filename, data.zipname);
    this._downloadData = data;
    this.gotoStep(2);
    this.__progress.restart(this._filesize);

    if (this._mode == _a.backup) {
      this.downloadBackup();
      return
    }
    this.__progress.setLabel(LOCALE.BACKUP_READY);
    this.__actionButton.set({
      content: LOCALE.BACKUP_DOWNLOAD,
      service: _e.download,
    });
    this.__actionButton.el.dataset.role = _e.commit;
  }

}


module.exports = __account_data;

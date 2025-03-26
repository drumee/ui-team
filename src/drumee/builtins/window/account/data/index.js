const { colorFromName, filesize } = require("core/utils");
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
      other: LOCALE.OTHER
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

  // ===========================================================
  // onPartReady
  // ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "data-chart":
        return this._chart = child;
    }
  }


  onServerComplain(e) {
    const c = this.__wrapperOverlay.children.last();
    //c.feed(S)
    return this.warn("GOT ERROR. TO BE HANDLED", e);
  }

  // ===========================================================
  // 
  // ===========================================================
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


  // // ===========================================================
  // // 
  // // ===========================================================
  //   confirmDeletion() {
  //     this.debug("CONFIRM leave");
  //     this.postService(SERVICE.drumate.confirm_delete_account, {
  //       secret: this._token,
  //       hub_id : Visitor.id 
  //     });
  //   }

  // ===========================================================
  // 
  // ===========================================================
  _display(data, title, subtitle) {
    if (data.disk) Visitor.set({ disk: data.disk });
    let disk = Visitor.get('disk');
    let other_value = 0;
    let i = 0;
    let other_index = 0;
    let details = _.map(data.details, (d) => {
      const o = {
        label: this._labels[d.category] || d.category,
        value: parseInt(d.size_per_type),
        color: colorFromName(d.category)
      };
      return o;
    })
    details[other_index].value = + other_value;
    let used = parseInt(data.usage.used_size);
    if (used > disk.quota_disk) used = disk.quota_disk;
    const available = disk.quota_disk - used;
    if (available < 0) available = 0;
    const details_chart = {
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

    const TYPES = {
      desk: { label: LOCALE.DESK, color: "#1d8aea" },
      chat: { label: LOCALE.CHAT, color: "#5d8aea" },
      private: { label: LOCALE.TEAM_ROOM, color: "#bd44d9" },
      share: { label: LOCALE.SHARE_BOX, color: "#ef6500" }
    };

    used = 1;
    let types = _.keys(disk).filter(function (e) {
      return (!/^quota/.test(e))
    });
    let content = [{
      label: LOCALE.SPACE_AVAILABLE,
      value: 0,
      color: "#89929e"
    }];
    for (var type of types) {
      if (!TYPES[type]) continue;
      TYPES[type].value = disk[type];
      used = used + disk[type];
      content.push({
        ...TYPES[type], value: disk[type]
      })
    }
    content[0].value = disk.quota_disk - used;

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
    this.__totalSize.set({
      content: `${LOCALE.DATA_USAGE} ${filesize(used)}/${filesize(disk.quota_disk)}`
    });


    this.findPart("ref-chart").feed([usage_chart, details_chart]);
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
        this.debug("DOWNLOAD TENIMATED");
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


  // __dispatchRest(method, data, socket) {
  //   switch (method) {
  //     case SERVICE.desk.backup:
  //       if (data.wait == 0) {
  //         this.backupReady(data, data.wait);
  //       }
  //       break;

  //     case SERVICE.drumate.confirm_delete_account:
  //       if (data.rejected) {
  //         Wm.alert(LOCALE.INVALID_LINK);
  //         return;
  //       }
  //   }
  // }

  // __dispatchPush(service, data) {
  //   if (_.isEmpty(data) || !this.__progress) {
  //     return;
  //   }
  //   switch (data.exit) {
  //     case 0:
  //       this.backupReady(data);
  //       break;
  //     case 1:
  //       this.warn("GOT ERROR");
  //       break;
  //     case null: case undefined:
  //       this.__progress.update(data.progress);
  //   }
  // }

}


module.exports = __account_data;

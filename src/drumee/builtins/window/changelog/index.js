const mfsInteract = require('../interact');
const { filesize } = require('core/utils')
class __window_changelog extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    this.isFolder = 1;
    super.initialize(opt);
    this.bindEvent('live');
    if (Visitor.device() === _a.desktop) {
      const width = _K.iconWidth * 6;
      this.style.set({
        left: (window.innerWidth - width - Wm.$el.offset().left - 10) / 2,
        top: 0,
        minHeight: 340,
        minWidth: 700,
        width
      });
    } else {
      this.style.set({
        left: 0,
        top: 0,
        width: window.innerWidth,
        minHeight: 440,
      });
    }

    this._onTaskTerminated = this._onTaskTerminated.bind(this);

    this.skeleton = require("./skeleton")(this);
    edBridge.on('local-web-item-deleted', this.removeItem.bind(this));
    mfsActivity.on(`mfs-task-terminated:*`, this._onTaskTerminated);

  }


  /**
   * 
   * @param {*} filepath 
   */
  async removeItem(filepath) {
    this.debug("AAA:58 -- removeItem", filepath);
  }

  /**
   * 
   */
  async _onTaskTerminated(evt) {
    this.debug("AAA:57 -- r_onTaskTerminated", evt);
    if (this.isDestroyed()) {
      return
    }
  }

  /**
   * 
   */
  checkChanges() {
    let changes = this.mget('changes');
    this.debug("AAA:73", changes, _a.mode, this.mget(_a.mode), this.mget("engine"))
    if (!this.mget("engine")) {
      this._content.feed(require('./skeleton/help')(this));
      return;
    }
    if (!this.hasChanges(changes) && this.mget("engine") != 0) {
      this.suppress();
      return;
    }
    this._content.feed(require('./skeleton/changes')(this));
  }

  /**
   * 
   */
  syncAll() {
    let changes = this.mget('changes');
    this.ensurePart('events-list').then((p) => {
      for (let c of p.children.toArray()) {
        c.logEvent();
      }
    })
  }

  /**
   * 
   */
  showDifferences(changes) {
    this.mset({ changes });
    if (!this.hasChanges(changes)) {
      this._content.feed(
        require('./skeleton/prepare-changes')(
          this,
          LOCALE.FILES_ARE_SYNCED,
          1
        )
      );
      return;
    }
    this._content.feed(require('./skeleton/changes')(this));
  }

  /**
   * @param {any} child
   * @param {any} pn
  */
  async onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case _a.content:
        this._content = child;
        this.setupInteract();
        const { disk_free } = await MfsWorker.getDiskUsage();
        let { total } = Visitor.diskUsage() || {};
        if (total == null) {
          try {
            let { usage } = await Wm.fetchService(SERVICE.drumate.data_usage, { hub_id: Visitor.id }) || {};
            if (usage) {
              Visitor.set({ disk_usage: usage })
              total = Visitor.diskUsage().total
            }
          } catch (e) {
            total = 0;
          }
        }
        const disk_needed = filesize(total);
        const { settings } = await MfsWorker.getEnv();
        this.mset(settings);
        this.mset({ disk_free, disk_needed })
        switch (this.mget(_a.screen)) {
          case 'highRate':
            child.feed(require('./skeleton/high-rate-change')(this));
            return;
          case 'showChanges':
            child.feed(require('./skeleton/changes')(this));
            return;
          case 'info':
            child.feed(require('./skeleton/settings-info')(this));
            return;
          case 'help':
            child.feed(require('./skeleton/help')(this));
            return;
          case 'immediate':
            child.feed(require('./skeleton/settings-immediate')(this));
            return;
          case 'progress':
            child.feed(require('./skeleton/settings-immediate')(this));
            return;
          case 'engine':
            let engine = this.mget('engine');
            if (engine == 0) {
              child.feed(require('./skeleton/help')(this));
              return;
            }
        }
        this.checkChanges();
        break;

      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
   */
  async getChangelog() {
    let changes = await MfsWorker.getChangelog();
    this.debug("AAA:130", changes);
    let isEmpty = 1;

    for (let target of ['remote', _a.local]) {
      for (let type in changes[target]) {
        if (!changes[target][type]) continue;
        let length = changes[target][type].length;
        let detail = this.getPart(`${target}-${type}-detail`);
        let count = this.getPart(`${target}-${type}-count`);
        let list = this.getPart(`${target}-${type}-list`);
        //this.debug("AAA:137", `${target}-${type}-detail`, detail, count );
        if (!detail || detail.isDestroyed()) continue;
        if (!count || count.isDestroyed()) continue;
        if (length) {
          isEmpty = 0;
          let content = LOCALE[`ITEMS_${type}`.toUpperCase()].format(length);
          count.set({ content });
        } else {
          detail.setState(0);
          if (list) list.clear();
        }
      }
    }
    if (isEmpty) this.goodbye();
  }

  // ===========================================================
  //
  // ===========================================================
  onWsMessage(service, data, options = {}) {
    if (!/^(media)/.test(options.service)) return;
    this.debug("AAA:155", options.service, data, options, this.el, this);
  }

  /**
   * 
   */
  display(target, type) {
    let list = this.getPart(`${target}-${type}-list`);
    let count = this.getPart(`${target}-${type}-count`);
    this.debug("AAA:116", `${target}-${type}-list`, count, { type, target });
    if (list.isEmpty()) {
      MfsWorker.getChangelog({ type, target }).then((files) => {
        this.debug("AAAA:121", files);
        if (_.isEmpty(files)) return;
        let items = files.map((e) => {
          //this.debug("AAAA:121", e);
          return {
            ...e,
            kind: 'media_local',
            type,
            target,
            uiHandler: this
          }
        })
        //let height = Math.min(340 + (30 * items.length), window.innerHeight - 30);
        //this.$el.css({ height });
        let chunks = [];
        if (items.length > 10) {
          var i, j, chunk, length = 10;
          for (i = 0, j = items.length; i < j; i += length) {
            chunk = items.slice(i, i + length);
            chunks.push(chunk);
          }
          this.debug("AAAA", chunks);
          let walk = () => {
            let c = chunks.shift();
            if (!c) return;
            if (list.isEmpty()) {
              list.feed(c);
            } else {
              list.append(c);
            }
            setTimeout(walk.bind(this), 1000)
          }
          walk();
        } else {
          list.feed(items);
        }
      })
    } else {
      list.clear();
    }
    for (var n of ['created', 'deleted', 'moved', 'renamed', 'changed', 'ignored']) {
      if (type != n) {
        let l = this.getPart(`${target}-${n}-list`);
        l && l.clear();
      }
    }
  }

  /**
   * 
   * @param {*} cmd 
   */
  showChangelog(tab) {
    this.ensurePart('changelog-container').then((p) => {
      this.debug("AAA:267", p.children.isEmpty())
      p.clear()
      p.feed(require('./skeleton/changelog')(this, tab))
      // if(p.children.isEmpty()){
      //   p.feed(require('./skeleton/changelog')(this, tab))
      // }else{
      //   p.clear()
      // }
    })
  }

  /**
   * 
   * @param {*} cmd 
   */
  showChanges(cmd) {
    let type = cmd.mget(_a.type);
    let target = cmd.mget(_a.target);
    this.display(target, type);
  }

  // ********************************************
  // User interaction
  // *********************************************

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service)
    this.debug(`AAA:82 onUiEvent service = ${service}`, cmd, this)
    switch (service) {
      case 'show-changelog':
        this.showChangelog(cmd.mget(_a.tab));
        break;
      case "local-closed":
        if (this.timer || this._waitConfirm) return;
        this.timer = setTimeout(async () => {
          await this.getChangelog();
          this.timer = null;
        }, 300);
        break;
      case _e.show:
        edBridge.send('web-sync-show-local', cmd.mget(_a.path));
        break;
      case "hide-tips":
        localStorage.setItem("hideSyncTips", "yes")
        break;
      case 'agree-to-close':
        this.__content.feed(require('./skeleton/confirm-sync-action')(this, "close"));
        break;
      case 'agree-to-sync':
        this._waitConfirm = 1;
        this.__content.feed(require('./skeleton/confirm-sync-action')(this));
        break;
      case 'back-to-check-sync':
        this.checkChanges();
        break;
      case 'sync-all':
        this.syncAll();
        break;
      case 'worker.pause':
        cmd.mset({ service: 'worker.resume' });
        cmd.set({ content: LOCALE.CHECK_SYNC_SUMMARY });
        MfsWorker.pause();
        // mfs.shell({ exec: service }).then(() => {
        //   // setTimeout(this.goodbye.bind(this), Visitor.timeout(1500));
        // })
        break;
      case 'worker.resume':
        cmd.mset({ service: 'worker.pause' });
        cmd.set({ content: LOCALE.PAUSE_AND_CHECK });
        this.getChangelog()
        //MfsWorker.resume();
        // mfs.shell({ exec: service }).then(() => {
        //   // setTimeout(this.goodbye.bind(this), Visitor.timeout(1500));
        // })
        break;
      case 'ack-alert':
        MfsWorker.resync().then(() => {
          setTimeout(this.goodbye.bind(this), Visitor.timeout(1500));
        })
        break;
      case 'retrieve':
        MfsScheduler.hardReset().then(() => {
          setTimeout(this.goodbye.bind(this), Visitor.timeout(1500));
        })
        break;
      case _e.close:
        this.goodbye();
        return;
      case 'stop-sync':
        MfsScheduler.stopSyncEngine().then(() => {
          this.goodbye();
        });
        break;

      case 'start-sync':
        let rootNode = { nid: Visitor.get(_a.home_id) };
        MfsScheduler.startSyncEngine(rootNode).then(() => {
          this.goodbye();
        })
        break
      case 'help':
        switch (cmd._target.getService()) {
          case "show-local":
            MfsWorker.showHomeDir();
            break;
          case "show-remote":
            window.open(bootstrap().endpoint, '_blank');
            break;
          case "show-menu":
            Account.showMenu({ name: 'sync' })
            break;
        }
        break
      case 'show-menu':
        Account.showMenu({ name: 'sync' })
        break

      default:
        super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __window_changelog;


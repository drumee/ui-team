/**
 * @license
 * Copyright 2024 Thidima SA. All Rights Reserved.
 * Licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

const { basename, dirname, normalize } = require("path");
const { rmSync, mkdirSync, existsSync } = require("fs");
const Attr = require("../lex/attribute");
const { isNaN, isArray } = require("lodash");
require("../core/addons");
const mfsUtils = require("./utils");
const Worker = require("./worker");
const { dialog, app } = require("electron");
const { checkForUpdates } = require("../core/minishell/auto-update");
const { sizeOfpending, unsetPending } = require("./core/locker");

global.IGNORED =
  /^\.goutput|^[A-F0-9]{8,8}$|\.tmp$|\.db$|\~.+$|^__|Thumbs.db|\.DS_Store|__MACOSX|.thumbnails$|\..+\.sw.+$|\~$/;

class Scheduler extends mfsUtils {

  /**
   * 
   */
  initialize(opt) {
    this.webEvents = {
      "web-downstream-edit-file": "log",
      "web-downstream-log": "log",
      "web-mfs-action": "log",
      "web-mfs-inspec": "inspect",
      "scheduler-start-engine": "startSyncEngine",
      "scheduler-stop-engine": "stopSyncEngine",
      "scheduler-hard-reset": "hardReset",
    };

    this.userEvents = {
      "menu-sync-reset": "menu_sync_reset",
      "menu-sync-resync": "menu_sync_resync",
    };

    super.initialize(opt);

    this.event = {
      ...this.event,
      ...require("./utils/event")(this),
    };

    this.task = {
      ...this.task,
      ...require("./utils/task")(this),
    };

    this.journal = {
      ...this.journal,
      ...require("./utils/journal")(this),
    };

    this.remote = {
      ...this.remote,
      ...require("./utils/remote")(this),
    };

    this.local = {
      ...this.local,
      ...require("./utils/local")(this),
    };

    this.syncOpt = {
      ...this.syncOpt,
      ...require("./utils/sync-opt")(this),
    };

    this._isIdle = false;
    global.mfsScheduler = this;
    this.maxTasks = 2;
    this.tickInterval = 300;
    this._timer = null;
    this.event.clear();
    this.journal.clear();
    this.task.clear();
    this.initialSync = 0;
    this.home_id = Account.user.get(Attr.home_id);
    this.hub_id = Account.user.get(Attr.id);
    this.bindEvents();
    this.worker = new Worker(opt);
  }

  /**
   *
   */
  destroy() {
    super.destroy();
    this.worker.destroy();
    this.worker = null;
    this._isDestroyed = 1;
  }

  /**
   *
   */
  waitForTask(task, timeout = 1000) {
    return new Promise((resolve, reject) => {
      let state = this.syncOpt.getNodeState(task);
      if (state == 0) return resolve();
      let t = setTimeout(() => {
        resolve('timeout');
      }, timeout);
      let e = `end-of:${task.filepath}`;
      this.once(e, (evt) => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  /**
   *
   */
  async startSyncEngine(opt = {}) {
    let { channel, args } = opt;
    if (Account.user.isOnline()) {
      this.set({ running: 1, ready: 0 });
      this.worker.startSyncEngine().then(() => {
        this.set({ running: 1, ready: 1, frozen: 0 });
      })
    } else {
      this.debug("SYNC ALLOWED IN ANOMYNOUS CONTEXT");
      args = { ...args, error: "PERMISSION_DENIED" }
    }
    if (channel) {
      webContents.send(channel, args);
    }
  }

  /**
   *
   */
  async stopSyncEngine(opt) {
    this.set({ running: 0, frozen: 1 });
    this.debug("Stopping Sync Scheduler")
    let settings = this.syncOpt.changeSettings({ effective: 0 });
    this.debug("Starting Sync Scheduler", settings)
    this.event.clear();
    clearInterval(this._timer);
    this.worker.stopSyncEngine();
    if (opt) {
      let { channel } = opt;
      webContents.send(channel, {});
    }
  }

  /**
   *
   * @param {*} args
   */
  async menu_sync_resync(args = {}) {
    let r = await this.worker.resync();
    webContents.send("mfs-resync", r);
  }

  /**
   *
   */
  async checkSecurity() {
    let changes = this.journal.nextChanges();
    if (changes > 1) {
      changes = await this.journal.confirmChanges();
      if (changes <= 1) return;
      this.set({ frozen: 1 });
      if (this.alertPending) return;
      this.alertPending = 1;
      clearTimeout(this._timer);
      let skip = await this.highRateChange();
      if (skip) {
        this.alertPending = 0;
      }
      return skip;
    }
    return true;
  }

  /**
   *
   */
  highRateChange() {
    const options = {
      type: "question",
      buttons: [LOCALE.RETRIEVE, LOCALE.ALL_IS_NORMAL, LOCALE.CLOSE],
      defaultId: 0,
      detail: USER_HOME_DIR,
      title: LOCALE.RANSOMWAR_ALERT,
      message: LOCALE.HIGH_RATE_CHANGE,
    };
    return new Promise((resole, reject) => {
      dialog.showMessageBox(null, options).then((r) => {
        this.alertPending = 0;
        switch (r.response) {
          case 0:
            clearTimeout(this._timer);
            this.worker.menu_sync_reset();
            resole(false);
            break;
          case 1:
            this.journal.clearAlert();
            clearInterval(this._timer);
            this._timer = setInterval(this.run.bind(this), this.tickInterval);
            resole(true);
            break;
          default:
            this.journal.clearAlert();
            this.event.clear();
            clearInterval(this._timer);
            this._timer = setInterval(this.run.bind(this), this.tickInterval);
            resole(true);
        }
      });
    });
  }


  /**
   *
   */
  async resetFromScratch(channel) {
    if (!/DrumeeLocal|DrumeeDrive/.test(USER_HOME_DIR)) {
      this.debug("EEE -- Not within a safe folder !!!", USER_HOME_DIR);
      return;
    }
    this.remote.clear();
    this.fsnode.clear();
    this.journal.clear();
    // this.local.clear();
    await this.shutdown();
    this.debug(`Removing USER_HOME_DIR=${USER_HOME_DIR}...`);
    rmSync(USER_HOME_DIR, { recursive: true });
    if (!existsSync(USER_HOME_DIR)) {
      mkdirSync(USER_HOME_DIR, {
        recursive: true,
      });
    }
    setTimeout(() => {
      app.isQuiting = true;
      app.relaunch();
      app.exit(0);
    }, 1000);
  }

  /**
*
*/
  hardReset(opt) {
    let { channel, args } = opt;
    this.menu_sync_reset(channel);
  }


  /**
   *
   * @param {*} args
   */
  menu_sync_reset(channel) {
    this.debug("[273] menu_sync_reset", this.diskSpace);
    const options = {
      type: "question",
      buttons: [LOCALE.CANCEL, LOCALE.GOT_IT],
      defaultId: 0,
      detail: USER_HOME_DIR,
      title: LOCALE.RESET_SYNC,
      message: LOCALE.RESET_SYNC_TIPS,
      checkboxChecked: false,
    };

    dialog.showMessageBox(null, options).then(async (r) => {
      switch (r.response) {
        case 1:
          this.resetFromScratch(channel);
          break;
        default:
          this.debug(r.response);
      }
    });
  }


  /**
   *
   */
  start() {
    clearInterval(this._timer);
    this._timer = setInterval(this.run.bind(this), this.tickInterval);
  }

  /**
   *
   */
  async prepare() {
    this.set({ running: 1, frozen: 0 });
    let settings = this.syncOpt.rootSettings();
    await this.startSyncEngine()
    return settings;
  }

  /**
   *
   */
  pause() {
    this.sendMediaActivity({ events: 0 });
    clearInterval(this._timer);
    this._timer = null;
    if (!sizeOfpending(Attr.downloaded)) {
      setTimeout(this.next.bind(this), 1000);
    }
  }

  /**
   *
   * @returns
   *
   */
  next() {
    let { mode, effective } = this.syncOpt.rootSettings();
    if (mode != Attr.immediate) return;
    if (!effective) {
      this.sendMediaActivity({ events: 0 });
      return;
    }
    let items = this.remote.unsynced();
    if (!items) return;
    let item = items.shift();
    //let progress = this.local.syncRatio(); // (1 - items.length / this.unsyncedItems) * 100;
    // if (!isNaN(progress)) {
    //   this.sendMediaActivity({ phase: "total", progress });
    // }
    while (item) {
      if (!this.syncOpt.getNodeState(item)) {
        item = items.shift();
      } else {
        if (this.event.pending() > 50) return;
        if (this.event.isClean(item, "media.init")) {
          this.log({ ...item, name: "media.init" });
        }
        return;
      }
    }
  }
  /**
   *
   */
  async shutdown() {
    await this.stopSyncEngine();
    this.worker.stop();
  }


  /**
   *
   */
  resume(args) {
    this.set({ running: 1, frozen: 0 });
    this.pause();
  }

  /**
   *
   */
  checkSanity(evt) {
    // TO DO Check hight rate events
    if (!evt || !evt.id) {
      this.debug("AAA:40 Task requires eventi id");
      return false;
    }
    return this.event.exists(evt);
  }

  /**
   *
   * @param {*} evt
   * @returns
   */
  prepareData(evt) {
    let { eventId, reuseEvent } = evt;
    let node, src, dest;
    switch (evt.name) {
      case "media.rename":
      case "media.move":
        return;
      case "fs.move":
      case "fs.rename":
        let arg;
        let e = { ...evt };
        if (reuseEvent) {
          e.eventId = reuseEvent;
        }
        src = this.source.row(e, Attr.eventId);
        if (!src) {
          arg = { ...evt, filepath: evt.src };
          src = { ...arg, ...this.fsnode.coalesce(arg, Attr.filepath, "local") };
        }
        src.eventId = eventId;
        src.dirname = dirname(src.filepath);
        this.source.upsert(src);

        dest = this.destination.row(e, Attr.eventId);
        if (!dest) {
          arg = { ...evt, filepath: evt.src };
          dest = { ...arg, ...this.fsnode.coalesce(arg, Attr.filepath, "local") };
          dest.filepath = arg.dest;
        }
        dest.eventId = eventId;
        dest.inode = src.inode;
        dest.dirname = dirname(dest.filepath);
        this.destination.upsert(dest);
        return;
      case "folder.moved":
      case "folder.renamed":
      case "file.moved":
      case "file.renamed":
        return;

      case "media.new":
      case "media.copy":
      case "media.init":

      case "file.deleted":
      case "file.modified":
      case "file.created":
      case "folder.deleted":
      case "folder.modified":
      case "folder.created":
        return;
    }
  }

  /**
   *
   * @param {*} evt
   */
  async shouldBypassIgnore(evt) {
    let { response } = await this.confirm({
      buttons: [LOCALE.NO, LOCALE.YES],
      detail: evt.filepath,
      title: LOCALE.WARNING,
      message: LOCALE.CONFIRM_FILE_CHANGED,
    });
    if (!response) {
      return;
    }
    evt.args = { ...evt.args, force: 1 };
    this.log(evt);
    return;
  }

  /**
   * Log every event sent by :
   * > local agent (Filesystem events)
   * > remote agent (Web/UI events)
   */
  log(evt) {
    if (!evt) return;
    if (evt.filepath) {
      evt.filepath = normalize(evt.filepath);
    }
    if (isArray(evt)) {
      for (let item of evt) {
        this.log(item);
      }
      return;
    }

    /** Pseudo array */
    if (evt["0"] && evt["0"].filepath) {
      for (let i in evt) {
        if (/[0-9]+/.test(i)) {
          this.log({ ...evt[i], name: evt.name });
        }
      }
      return;
    }

    let { args, syncId } = evt;
    let { changelog } = args || {};
    if (!evt.filepath && changelog && changelog.src) {
      if (isArray(args.changelog.src)) {
        for (let item of args.changelog.src) {
          this.log({ ...item, name: args.changelog.event });
        }
        return;
      }
      evt = { evt, ...args.changelog.src }
    }

    if (this.get("frozen")) {
      if (!args || !args.force) return;
      this.debug("AAA:692 FROZEN", evt);
    }
    if (!this._timer) this.start();
    if (!evt.name) {
      this.debug(`Event has no name`, evt.args);
      return
    }
    if (!evt.filepath) {
      if (evt.file_path) evt.filepath = evt.file_path;
      if (!evt.filepath) {
        let node = this.remote.row(evt, Attr.nid, Attr.filepath);
        if (!node || !node.filepath) {
          node = this.fsnode.row(evt, Attr.filepath);
          this.debug("AAA:408 MISSING FILEPATH", evt);
          return;
        }
        evt.filepath = node.filepath;
      }
    }
    evt.args = this.event.parseArgs(evt);
    const { syncEnabled } = evt.args;
    if (syncEnabled != null) {
      evt.effective = syncEnabled;
      this.syncOpt.changeNodeSettings(evt);
    }
    this.syncOpt.addNodeSettings(evt)
    let effective = this.syncOpt.getNodeState(evt);
    if (syncId) {
      evt.args.syncId = syncId;
    }

    if (!effective && !evt.args.force) {
      if (/^(file.modified|file.changed)$/.test(evt.name)) {
        this.shouldBypassIgnore(evt);
      }
    }
    if (!evt.ownpath) {
      evt = this.remote.ensureOwnpath(evt);
    }

    this.debug(`AAA:619 [log][effective=${effective}] name=${evt.name} -> ${evt.filepath} [${evt.ownpath}]`);
    if (!effective) {
      this.debug(`AAA:617 -- IGNORED =${evt.filepath}`);
      return;
    }
    evt.id = null;
    evt.timestamp = new Date().getTime();
    evt.ctime = evt.ctime || Math.round(evt.timestamp / 1000);
    evt.mtime = evt.mtime || evt.ctime;
    evt.origin = this.name();
    let eventId = this.event.write(evt);
    return eventId;
  }

  /**
   *
   * @returns
   */
  async run() {
    if (this.alertPending) {
      this.debug("AAA:742 -- can not run since there is pending alert");
      return;
    }
    if (!Account.get(Attr.socket_id)) {
      this.debug("AAA:572 socket not bound yet");
      return
    }
    let events = this.event.log(new Date().getTime());
    let running = events.length;
    if (!running) {
      this.pause();
      return;
    }
    this.sendMediaActivity({ events: running % 2 });
    let pending = this.task.pending();
    if (pending > this.maxTasks) {
      process.stdout.write(
        `Queue state :events=${running}  task=${pending} \r`
      );
      return;
    }
    let evt = events.shift();
    if (!evt) return;
    let ok = await this.checkSecurity(evt);
    if (ok) {
      try {
        await this.dispatch(evt);
      } catch (e) {
        this.warn(`Failed to run`, e)
      }
    }
  }

  /**
   *
   */
  async dispatch(evt) {
    if (!this.checkSanity(evt)) return;
    try {
      let state = Attr.started;
      let retry = 0;
      let w = this.worker;
      if (!w || !w.isReady()) {
        state = Attr.queued;
        this.handleTaskState({ worker: evt.name, ...evt }, state);
      } else {
        this.task.insert({ worker: evt.name, ...evt, state, retry });
        state = await w.dispatch(evt);
        this.handleTaskState(evt, state);
      }
    } catch (e) {
      this.debug("Failed to rn worker", e);
      this.fail(evt);
    }
  }



  /**
   * 
   */
  onNormalEnd(evt, state) {
    this.task.terminate(evt);
    this.sendMediaActivity({ ...evt, phase: "task-terminated" });
    this.debug(`[onNormalEnd]:616[${state}] ${evt.name} ${evt.filepath}`);
    this.trigger(Attr.terminated, evt);
  }

  /**
   *
   */
  handleTaskState(evt, state) {
    this.debug(`AAA:698 [end][${state}] ${evt.name} ${evt.filepath}`);
    this.trigger(`end-of:${evt.filepath}`, evt);
    if (evt.nid || evt.filepath) {
      let settings = this.syncOpt.getNodeSettings(evt);
      this.sendMediaActivity({ ...evt, ...settings, phase: "end-of-task" });
    }

    switch (state) {
      case Attr.terminated:
        this.onNormalEnd(evt, state);
        if (sizeOfpending() < 4) {
          this.next();
        }
        break;
      case Attr.queued:
        this.task.update({ ...evt, state });
        if (!evt.ownpath) this.remote.ensureOwnpath(evt);
        this.event.write(evt);
        break;
      case Attr.synced:
        unsetPending(Attr.media, evt.filepath);
      case Attr.skip:
      case Attr.ignored:
        this.onNormalEnd(evt, state);
        break;
      case Attr.permission_denied:
        this.debug(`TBD handle: permission_denied ${state}`);
        this.task.terminate(evt);
        break;
      case Attr.failed:
        this.fail(evt);
        break;
      case Attr.isDirectory:
        this.warn("Got directory in stead of file", evt);
        break;
      case 'conflict-local':
        this.worker.confirmOverwrite(evt, 'local');
        break;
      case 'conflict-remote':
        this.worker.confirmOverwrite(evt, 'remote');
        break;
      case "alive":
      case null:
      case undefined:
      case false:
        return;
      default:
        this.debug("AAA:123 UNEXPECTED STATE", evt, state);
    }
  }

  /**
   * 
   * @param {*} e 
   */
  handleError(e = {}) {
    switch (e.code) {
      case 'EBUSY':
        let filename = basename(e.path || e.dest);
        const options = {
          type: "info",
          buttons: [LOCALE.GOT_IT],
          defaultId: 0,
          detail: e.path || e.dest,
          title: LOCALE.UNABLE_TO_SYNC,
          message: LOCALE.FILE_X_IS_BUSY.format(filename),
          checkboxChecked: false,
        };

        dialog.showMessageBox(null, options).then(async (r) => {

        });
      default:
        this.debug("Unhandled error", e)
    }
  }

  /**
   *
   * @param {*} event
   */
  fail(e) {
    if (e.dontRetry) {
      this.debug(`FAILED TO RUN ${e.name}. Give up`);
      return this.task.terminate(e);
    }
    let error = this.event.getError(e);
    this.debug(`FAILED TO RUN ${e.name}`, error);
    this.handleError(error);
    console.trace();

    let row = this.task.row(e, Attr.id);
    if (!row) {
      this.debug("Task not found", e)
      return;
    }
    this.debug(`PENDING TASK`, row);
    if (row.retry == null) row.retry = 0;
    if (row.retry < 3) {
      row.retry++;
      this.task.update(row);
    } else {
      this.task.terminate(evt);
    }
  }

  /**
   *
   */
  async inspect(opt) {
    let { channel, args } = opt;
    let command = args.shift();
    let res = {};
    switch (command) {
      case "checkForUpdates":
        res = await checkForUpdates();
        break;
      case "rename":
        let table = args.shift();
        let node = args.shift();
        res = await this[table].rename(node);
        break;
    }
    webContents.send(channel, res);
  }

  /**
   *
   */
  abortDownloads() {
    for (let item in pendingDownloads) {
      let request = item[1];
      if (!request || !request.abort) continue;
      request.abort();
    }
  }
  /**
   *
   */
  abortUplaods() {
    for (let item in pendingUploads) {
      let request = item[1];
      if (!request || !request.abort) continue;
      request.abort();
    }
  }
}
module.exports = Scheduler;

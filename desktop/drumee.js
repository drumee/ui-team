/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : drumee-electron/index.js
 * TYPE : Skelton
 * ===================================================================**/

const { resolve, join, dirname } = require('path');
const { app, BrowserWindow, screen, net, Menu, nativeImage, Tray, shell, dialog } = require('electron');
const url = require('url');
const Fs = require('fs');
const Attr = require('./lex/attribute');
const account = require('./core/account');
const minishell = require('./core/minishell');
global.win = null;
const { sizeOfpending } = require("./mfs/core/locker");
const { mkdirSync, existsSync, renameSync, symlinkSync } = require('fs');


/**
 * App main window will get created from the ready action.
 */
class Drumee {
  constructor() {
    this.mainWindow = null;
    this.build_configs();
    this.init();
  }


  /**
   * 
   */
  build_configs() {
    const { webVersion, desktopVersion, timestamp, hash, no_hash } = require("./dist-web/index.json");
    if (no_hash) {
      this.pdfworker = `./pdfworker.js`;
    } else {
      this.pdfworker = `./pdfworker-${hash}.js`;
    }

    this.confDir = app.getPath(Attr.userData);
    global.USER_DBDIR = resolve(this.confDir, 'localDB');
    console.log(`
      UI version=${webVersion}, 
      Desktop version=${desktopVersion},
      Node=${process.versions.node},
      Build time ${new Date(timestamp).toLocaleDateString("en-GB")}`
    );
    let oldName = resolve(app.getPath('home'), 'DrumeeDrive');
    let locName = resolve(app.getPath('home'), 'DrumeeLocal');
    if (!existsSync(locName)) {
      if (existsSync(oldName)) {
        try {
          renameSync(oldName, locName);
        } catch (e) {

        }
      } else {
        mkdirSync(locName)
      }
    }
    let link = resolve(app.getPath('desktop'), 'DrumeeLocal');
    if (!existsSync(link)) {
      try {
        symlinkSync(locName, link);
      } catch (e) {

      }
    }
    console.log(`Starting plateform=${process.platform} with Bootstrap : `);

    global.USER_DATADIR = locName;
    global.CUR_VERSION = desktopVersion;
    new minishell();
  }

  /**
   * 
   */
  restoreWindow() {
    if (global.win) {
      if (this.hidden) win.show();
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus()
    } else {
      console.error("Could not restore window!!!");
      // app.quit();
    }
  }

  /**
   * 
   */
  init() {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.setAppUserModelId(process.execPath);

    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      console.error("There is already another instance running!!!");
      app.quit();
    } else {
      app.on('second-instance', (event, commandLine, workingDirectory) => {
        console.error("SECOND INSTANCE!!!");
        if (!win) return;
        // Someone tried to run a second instance, we should focus our window.
        if (win.isMinimized()) {
          this.restoreWindow();
        }
      })

      // Create myWindow, load the rest of the app, etc...
      app.on('ready', () => {
        this.start();
      })
    }

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
      console.log("All windows are closed!");
    })

    app.on('activate', (e) => {
      //console.log("ACTIVATE ", e, BrowserWindow.getAllWindows().length);
      if (BrowserWindow.getAllWindows().length === 0) {
        this.start();
      } else {
        this.restoreWindow();
      }
    })

    // Event listener to check content is created in window.
    app.on('web-contents-created', (event, contents) => {
      contents.on('will-attach-webview', (event, webPreferences, params) => {
        console.log("AAA:137", params)
        webPreferences.nodeIntegration = true
      })
    })


  }

  isOnline() {
    if (ARGV.dev && ARGV.offline) return false;
    return net.online;
  }

  /***
   * 
   */
  getIcon() {
    // let base = resolve(app.getAppPath(), '..', 'icons', process.platform);
    let base = resolve(app.getAppPath(), '..', 'icons', 'png');
    console.log("BASE", { base })
    return join(base, '64x64.png');
    // switch (process.platform) {
    //   case "darwin":
    //     return join(base, 'icon.icns');
    //   case "linux":
    //   case "win":
    //     return join(base, 'icon.ico');
    // }
  }
  /**
   * 
   */
  normalWindow(callback) {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    let preload = resolve(app.getAppPath(), 'bridge/web.js');
    let install_dir = dirname(app.getPath("exe"))
    console.log("normalWindow", { width, height, preload }, app.getAppPath(), install_dir);
    let w = new BrowserWindow({
      width: Math.min(width, 1400),
      height: 800, //Math.min(height, 800),
      minWidth: 800,
      minHeight: 600,
      title: "Drumee Desktop",
      icon: this.getIcon(),
      show: false,
      backgroundColor: '#333',
      webPreferences: {
        preload,
      }
    });

    this.mainWindow = w;
    this.webContents = w.webContents;

    let pathname = join(app.getAppPath(), 'dist-web/index.html');
    let location = url.format({
      pathname,
      protocol: 'file:'
    });
    w.loadURL(location);

    if (!app.dock || !app.dock.setBadge) {
      // windows badge notification count.
      const Windowbadge = require('electron-windows-badge');
      new Windowbadge(w, { font: '8px arial', color: '#ff3333' });
    }

    this.webContents.session.setPermissionCheckHandler((webCont, perm, origin, details) => {
      console.log('ChromePermissionCheck', perm, origin, details);
      return true;
    });

    // Open link to the browser
    this.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    if (ARGV.dev && ARGV.openDev) {
      this.webContents.openDevTools({ mode: 'detach' });
      console.log("AAA:224", ARGV, w.webContents.openDevTools)
    }

    // App States
    w.once('ready-to-show', () => {
      console.log("**************** STARTING DRUMEE DESKTOP APPLICATION *********************");
      try {
        this.mainWindow.show();
      } catch (e) {
        console.error("Caught error [E:214]", e);
        return;
      }
      callback(w);
      app.on("will-quit", (e) => {
        console.log("App recieved will-quit");
      });

      app.on("before-quit", (e) => {
        console.log("App recieved before-quit quit");
        console.log("App recieved before-quit 231");
        console.log("Saving sync state");
        try {
          //mfsWorker.local.saveSyncState()
        } catch (e) {
          console.log("Failed to save sync state", e);
        }

        if (sizeOfpending(Attr.downloaded) || sizeOfpending(Attr.uploaded)) {
          this.confirmQuit(e);
          return;
        }
        this.isQuiting = true;
      });

      app.on("quit", (e) => {
        console.log("App recieved quit");
      });

      process.on("SIGINT SIGTERM", () => {
        console.log("Detected SIGINT/SIGTERM");
        this.isQuiting = true;
      });

      process.on("SIGTERM", (e) => {
        console.log("Detected SIGTERM");
        this.isQuiting = true;
      });

    });
    w.on('close', (e) => {
      if (app.needToInstall) {
        return;
      }
      if (this.isQuiting) return;
      if (process.platform == 'darwin') {
        e.preventDefault();
        this.hidden = true;
        this.mainWindow.hide();
        console.log(process.platform, " keep alive");
        return;
      }
      console.log(process.platform, " actuallt quit");
      this.isQuiting = true;
      app.quit();
    });
    return w
  }


  /**
 * 
 */
  errorWindow(page) {
    // Create a window that fills the screen's available work area.
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    console.log("errorWindow", { width, height });
    //const preload = Pathpath.join(app.getAppPath(), 'bridge/web.js');
    //.resolve(__dirname, 'bridge/web.js');
    const preload = resolve(__dirname, 'bridge/web.js');
    let w = new BrowserWindow({
      width: Math.min(width, 1400),
      height: Math.min(height, 900),
      minWidth: 800,
      minHeight: 600,
      title: "Drumee",
      icon: `${__dirname}/icons/png/512x512.png`,
      show: false,
      backgroundColor: '#333',
      webPreferences: {
        preload,
      }
    });

    this.mainWindow = w;
    this.webContents = w.webContents;
    console.log("webContents ready");
    let pathname = join(__dirname, '../dist-web/offline.html');
    let location = url.format({
      pathname,
      protocol: 'file:'
    });
    w.loadURL(location);

    // App States
    w.once('ready-to-show', async () => {
      console.log("**************** STARTING DRUMEE DESKTOP APPLICATION *********************");
      try {
        this.mainWindow.show();
      } catch (e) {
        console.error("Caught error [E:214]", e);
      }

    });

    w.on('close', (e) => {
      app.quit();
    });
    return w
  }

  /**
   * 
   */
  createTray() {
    const icon = join(__dirname, '../icons/win/icon.ico');
    const trayicon = nativeImage.createFromPath(icon)
    let tray = new Tray(trayicon.resize({ width: 16 }));
    console.log("AAAA:36", tray, nativeImage.isMacTemplateImage, icon);
    tray.on('click', (e) => {
      console.log("AAAA:39", e);
    })
    tray.on('right-click', (e) => {
      console.log("AAAA:right-click39", e);
    })
    tray.on('balloon-show', (e) => {
      console.log("AAAA:39balloon-show", e);
    })
    tray.on('balloon-click', (e) => {
      console.log("AAAA:balloon-click39", e);
    })
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          this.restoreWindow()
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.quit() // actually quit the app.
        }
      },
    ])

    tray.setContextMenu(contextMenu);
  }

  /**
   * 
   */
  setTrayMenu() {
    if (!app.dock) return;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: LOCALE.FORCE_QUIT,
        click: () => {
          this.isQuiting = true;
          app.quit();
        }
      },
    ])
    //console.log("AAAA:246", contextMenu, app.dock.getMenu());
    app.dock.setMenu(contextMenu);
  }


  /**
   * 
   * @param {*} e 
   */
  confirmQuit(e) {
    const options = {
      type: 'question',
      buttons: [LOCALE.QUIT, LOCALE.WAIT],
      defaultId: 0,
      detail: USER_HOME_DIR,
      title: LOCALE.CAUTION,
      message: LOCALE.QUIT_WHILE_PENDING_SYNC,
    };
    dialog.showMessageBox(null, options).then((r) => {
      //this.alertPending = 0;
      switch (r.response) {
        case 0:
          mfsScheduler.worker.abortAllPending();
          this.isQuiting = true;
          break;
        case 1:
          e.preventDefault();
          break;
      }
    })
  }

  /**
  * 
  * @param {*} cookie 
  */
  start() {
    this.normalWindow((w) => {
      global.win = w;
      global.webContents = w.webContents;
      console.log("webContents ready");
      webContents.session.setCertificateVerifyProc((request, callback) => {
        let { hostname, certificate, validatedCertificate, verificationResult, errorCode } = request;
        if (errorCode === 0 || ARGV.dev) {
          callback(0);
          return;
        }
        /** TODO: ask user to accept untrust domain and register them */
        callback(0);
      });
      let Account;
      try {
        Account = new account({ pdfworker: this.pdfworker });
      } catch (e) {
        console.warn("EEE:432", e)
        return;
      }
      global.Account = Account;
      console.log("Preparing account", ARGV.dev, ARGV.openDev)
      Account.prepare().then(() => {
        console.log("Account prepared")
      }).catch((e) => {
        console.error("Failed to start application", e);
        this.errorWindow();
        // TO DO : need faillure handling
      });
    });
  }

}

module.exports = { Drumee };
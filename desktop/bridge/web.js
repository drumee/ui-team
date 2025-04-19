/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : drumee-electron/router/bridge.js
 * TYPE : Skelton
 * ===================================================================**/

const { ipcRenderer, contextBridge } = require("electron");
let CHANNEL = 0;
function getChannel() {
  CHANNEL++;
  return `channel-${CHANNEL}`;
}

let fn = (name, args = {}) => {
  const channel = getChannel();
  return new Promise((resolv, reject) => {
    ipcRenderer.once(channel, (e, a) => {
      resolv(a);
    });
    ipcRenderer.send(name, { channel, args });
  })
};

let fn2 = (name, ...opt) => {
  const channel = getChannel();
  return new Promise((resolv, reject) => {
    ipcRenderer.once(channel, (e, a) => {
      resolv(a);
    });
    ipcRenderer.send(name, { channel, args: opt });
  })
};

console.log("Preloading Web bootstrap...");
Notification.requestPermission((e) => {
  console.log("[36] requestPermission", e);
});

contextBridge.exposeInMainWorld("MfsWorker", {
  enableItemSync: (args) => {
    return fn('worker-enable-item', args);
  },
  disableItemSync: (args) => {
    return fn('worker-disable-item', args);
  },
  deleteLocalFile: (args) => {
    return fn('worker-delete-local', args);
  },
  getDiskUsage: (args) => {
    return fn('worker-get-disk-usage', args);
  },
  getSyncParams: (args) => {
    return fn('worker-get-sync-params', args);
  },
  getChangelog: (args) => {
    return fn('worker-get-changelog', args);
  },
  getUnsyncedItems: (args) => {
    return fn('worker-get-unsynced-items', args);
  },
  setSyncParams: (args) => {
    return fn('worker-set-sync-params', args);
  },
  syncAll: (args) => {
    return fn('worker-sync-all', args);
  },
  syncItem: (args) => {
    return fn('worker-sync-item', args);
  },
  pause: (args) => {
    return fn('worker-sync-pause', args);
  },
  resume: (args) => {
    return fn('worker-sync-resume', args);
  },
  resync: (args) => {
    return fn('worker-sync-resync', args);
  },
  abortSync: (args) => {
    return fn('worker-abort-sync', args);
  },
  getEnv: (args) => {
    return fn('worker-get-env', args);
  },
  showHomeDir: (args) => {
    return fn('worker-show-homedir', args);
  },
  showSyncDifferences: (args) => {
    return fn('mfs-show-sync-diff', args);
  },
});

contextBridge.exposeInMainWorld("MfsScheduler", {
  startSyncEngine: (args) => {
    return fn('scheduler-start-engine', args);
  },
  stopSyncEngine: (args) => {
    return fn('scheduler-stop-engine', args);
  },
  hardReset: (args) => {
    return fn('scheduler-hard-reset', args);
  },
  log: (name, data) => {
    ipcRenderer.send("web-downstream-log", { ...data, name });
  },
  showNode: (data) => {
    ipcRenderer.send("mfs-show-node", data);
  },
  inspect: (...args) => {
    return fn2('web-mfs-inspec', ...args);
  }
});

contextBridge.exposeInMainWorld("Minishell", {
  exec: (...args) => {
    return fn2('bridge-minishell', ...args);
  },
});

contextBridge.exposeInMainWorld("Account", {
  bootstrap: (args) => {
    return fn('account-bootstrap', args);
  },
  yp_env: (args) => {
    return fn('account-yp-env', args);
  },
  refreshMenu: (args) => {
    return fn('account-refresh-menu', args);
  },
  changeDomain: (args) => {
    return fn('account-change-domain', args);
  },
  newAccount: (args) => {
    return fn('account-reset', args);
  },
  gotSignedIn: (args) => {
    return fn('account-signed-in', args);
  },
  gotSignedOut: (args) => {
    return fn('account-signed-out', args);
  },
  reset: (args) => {
    return fn('account-reset', args);
  },
  relaunch: (args) => {
    return fn('account-relaunch', args);
  },
  userSettings: (args) => {
    return fn('account-user-settings', args);
  },
  openHome: (args) => {
    return fn('account-open-home', args);
  },
  setNotificationCount: (args) => {
    if (args && args.count) {
      ipcRenderer.send('update-badge', args.count);
    } else {
      ipcRenderer.send('update-badge', null);
    }
    return fn('account-set-notification', args);
  },
  showNotification: (args) => {
    return fn('account-show-notification', args);
  },
  listEndpoints: (args) => {
    return fn('account-list-endpoints', args);
  },
  changeEndpoint: (args) => {
    return fn('account-change-endpoint', args);
  },
  changeAccount: (args) => {
    return fn('account-change-account', args);
  },
  prepareMfs: (args) => {
    return fn('account-prepare-mfs', args);
  },
  removeEndpoint: (args) => {
    return fn('account-remove-endpoint', args);
  },
  update: (args) => {
    return fn('account-update', args);
  },
  syncSettings: (args) => {
    return fn('account-get-sync-settings', args);
  },
  showMenu: (args) => {
    return fn('account-show-menu', args);
  },
});

contextBridge.exposeInMainWorld("edBridge", {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, func) => {
    ipcRenderer.addListener(channel, (e, a) => {
      try {
        func(a);
      } catch (err) {
        console.warn(`ERR:214 -- Failed to handle channel ${channel} `, err, a);
      }
    });
  },
  once: (channel, func) => {
    ipcRenderer.once(channel, (e, a) => func(a));
  },
  off: (channel, func) => {
    ipcRenderer.removeListener(channel, func);
  },
  reset: () => {
    ipcRenderer.removeAllListeners();
  },
});




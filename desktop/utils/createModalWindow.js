const { BrowserWindow } = require('electron');
/**
 * Custome Modal Window.
 * @param {*} win 
 * @param {*} filePath 
 */
const modalWindow = (win, filePath) => {
  global.promptWindow = new BrowserWindow({
    parent: win,
    modal: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  // Note: this line we can uncommant when we need to debug.
  global.promptWindow.webContents.openDevTools();
  global.promptWindow.on('close', function () {
    global.promptWindow = null
  })
  global.promptWindow.loadFile(filePath);
  global.promptWindow.once('ready-to-show', () => {
    global.promptWindow.show();
  });
}

module.exports = modalWindow;
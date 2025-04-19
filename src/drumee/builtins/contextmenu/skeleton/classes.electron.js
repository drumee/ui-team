
module.exports = function(_ui_){
  let state = mfsActivity.mget(_a.state) == 1 ? _a.on : _a.off;
  const cn = { 
    enable_sync:`sync-${state}`,
    disable_sync:`sync-${state}`,
    account: 'account',
    background: 'desk-background',
    ignore: 'ignore strike',
    copy: 'copy',
    download:'download',
    fullscreen: 'fullscreen',
    exitFullScreen: 'exit-fullscreen',
    lock:'lock',
    newFolder: 'new-folder blue',
    openFileLocation: 'open-file-location',
    paste: 'paste',
    preferences: 'preferences',
    rotateLeft: 'flip-x',
    separator: 'separator',
    unlock:'unlock',
    upload:'upload',
    sync:'upload',
  };
  return cn;
};
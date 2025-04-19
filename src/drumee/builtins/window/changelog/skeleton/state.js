let contentFig;

/**
 * 
 * @param {*} m 
 * @returns 
 */
function trigger(m) {
  return `<span data-service="${m.service}" class="${m.fig}__link">${m.text}</span>`;
}

/**
 * 
 * @param {*} m 
 * @returns 
 */
function highlight(text) {
  return `<span  class="${contentFig}__highlight">${text}</span>`;
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function sklSyncInfo(ui) {
  contentFig = `${ui.fig.family}`;

  let syncState = Skeletons.Box.X({
    className: `${contentFig}__help container`,
  })

  let state = Skeletons.Note({
    className: `${contentFig}__help text tips`,
    service: "help"
  });
  let menu = trigger({
    service: "show-menu",
    fig: contentFig,
    text: LOCALE.SYNCHRONIZATION
  })

  let local = trigger({
    service: "show-local",
    fig: contentFig,
    text: ui.mget("localRoot")
  })
  let remote = trigger({
    service: "show-remote",
    fig: contentFig,
    text: bootstrap().domain
  })

  if (mfsActivity.mget(_a.sync)) {
    if (mfsActivity.mget(_a.mode) == "onTheFly") {
      state.content = LOCALE.SYNC_ENGINE_ON.format(highlight(LOCALE.ECONOMY_SYNC), menu);
    } else {
      state.content = LOCALE.SYNC_ENGINE_ON.format(highlight(LOCALE.IMMEDIATE_SYNC), menu);
    }
  } else {
    state.content = LOCALE.SYNC_ENGINE_OFF.format(local, remote, menu);
  }
  //state.content = LOCALE.SYNC_ENGINE_ON.format(highlight(LOCALE.ECONOMY_SYNC), menu);
  syncState.kids = [state];
  return syncState;
}
module.exports = sklSyncInfo;

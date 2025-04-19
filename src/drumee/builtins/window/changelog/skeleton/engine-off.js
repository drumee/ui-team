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
 * @param {*} _ui_ 
 * @returns 
 */
function sklSyncerHelp(_ui_) {
  contentFig = `${_ui_.fig.family}`;
  let buttons = require('./buttons')(_ui_, { content: LOCALE.OK, service: 'stop-sync' })
  const { user_domain } = bootstrap();
  let local = trigger({
    service: "show-local",
    fig: contentFig,
    text: _ui_.mget("localRoot")
  })
  let remote = trigger({
    service: "show-remote",
    fig: contentFig,
    text: user_domain
  })

  const purpose = Skeletons.Box.X({
    className: `${contentFig}__help container`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__help text summary`,
        content: LOCALE.SYNC_PURPOSE.format(local, remote),
        service: "help"
      })
    ]
  })

  let syncState = Skeletons.Box.X({
    className: `${contentFig}__help container`,
  })

  let state = Skeletons.Note({
    className: `${contentFig}__help text tips`,
    service: "show-menu"
  });
  let menu = trigger({
    service: "show-menu",
    fig: contentFig,
    text: LOCALE.SYNCHRONIZATION
  })
  if (mfsActivity.mget(_a.sync)) {
    if (mfsActivity.mget(_a.mode) == "onTheFly") {
      state.content = LOCALE.SYNC_ENGINE_ON.format(highlight(LOCALE.ECONOMY_SYNC), menu);
    } else {
      state.content = LOCALE.SYNC_ENGINE_ON.format(highlight(LOCALE.IMMEDIATE_SYNC), menu);
    }
  } else {
    state.content = LOCALE.SYNC_ENGINE_OFF.format(local, remote);
  }
  state.content = LOCALE.SYNC_ENGINE_ON.format(highlight(LOCALE.ECONOMY_SYNC), menu);
  syncState.kids = [state];
  let disk_free = _ui_.mget('disk_free');
  let disk_needed = _ui_.mget('disk_needed');
  const details = Skeletons.Box.Y({
    className: `${contentFig}__help container`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__help text title`,
        content: LOCALE.ECONOMY_SYNC
      }),
      Skeletons.Note({
        className: `${contentFig}__help text tips`,
        content: LOCALE.ECONOMY_MODE_TIPS
      }),
      Skeletons.Note({
        className: `${contentFig}__help text title`,
        content: LOCALE.IMMEDIATE_SYNC
      }),
      Skeletons.Note({
        className: `${contentFig}__help text tips`,
        content: LOCALE.IMMEDIATE_MODE_TIPS.format(disk_needed)
      }),
      Skeletons.Note({
        className: `${contentFig}__help text info`,
        content: LOCALE.YOUR_DISK_CAPACITY.format(disk_free)
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__container`,
        kids: [
          purpose,
          syncState,
          details,
          buttons
        ]
      })
    ]
  })

  return a;
}
module.exports = sklSyncerHelp;

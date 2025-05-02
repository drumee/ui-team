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
 * @param {*} ui 
 * @returns 
 */
function sklSyncerHelp(ui) {
  contentFig = `${ui.fig.family}`;
  let buttons = require('./buttons')(ui, { content: LOCALE.OK, service: 'stop-sync' })

  let local = trigger({
    service: "show-local",
    fig: contentFig,
    text: ui.mget("localRoot")
  })
  let remote = trigger({
    service: "show-remote",
    fig: contentFig,
    text: bootstrap().user_domain
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

  let syncState = require("./state")(ui);
  let disk_free = ui.mget('disk_free');
  let disk_needed = ui.mget('disk_needed');
  let separator = Skeletons.Element({
    className: `${contentFig}__separator`,
  });
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
        content: LOCALE.IMMEDIATE_MODE_TIPS.format(disk_needed.bold())
      }),
      Skeletons.Note({
        className: `${contentFig}__help text info`,
        content: LOCALE.YOUR_DISK_CAPACITY.format(disk_free.bold())
      }),
      separator,
      Skeletons.Note({
        className: `${contentFig}__help text tips`,
        content: LOCALE.SYNC_SELECTION_TIPS
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__content `,
        kids: [
          purpose,
          syncState,
          separator,
          details,
          buttons
        ]
      })
    ]
  })

  return a;
}
module.exports = sklSyncerHelp;

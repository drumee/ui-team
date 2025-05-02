

/**
 * 
 * @param {*} ui 
 */
function changedContent(ui, changes, title) {
  const fig = `${ui.fig.family}__content`;
  let maxHeight = window.innerHeight - ui.$el.height() - 50;
  const list = Skeletons.List.Smart({
    className: `${fig}__list`,
    flow: _a.none,
    bubble: 0,
    vendorOpt: Preset.List.Orange_e,
    uiHandler: ui,
    sys_pn: "events-list",
    placeholder: Skeletons.Note({
      className: `${fig}-header presentation`,
      content: LOCALE.NO_CHANGE
    }),
    style: {
      maxHeight
    },
  })
  let kids = [];
  for (let data of changes) {
    kids.push({
      data,
      kind: "changelog_event",
      uiHandler: [ui]
    })
  }
  list.kids = kids;
  return list;
}

/**
 * 
 * @param {*} ui 
 * @param {*} tab 
 * @returns 
 */
function main(ui, tab = 'remote') {
  const fig = `${ui.fig.family}__content`;
  let changes;
  let { local, remote } = ui.mget('changes') || {};
  let remote_tab = 1;
  if (tab == 'remote' && !_.isEmpty(remote)) {
    changes = changedContent(ui, remote)
  } else if (!_.isEmpty(local)) {
    changes = changedContent(ui, local);
    remote_tab = 0;
  } else {
    changes = Skeletons.Note({
      className: `${fig}-header presentation`,
      content: LOCALE.NO_CHANGE
    })
  }
  let content = Skeletons.Box.X({
    className: `${fig}__content`,
    sys_pn: "current-changelog",
    kids: changes
  })


  const header = Skeletons.Box.Y({
    className: `${fig}-header`,
    kids: [
      Skeletons.Note({
        className: `${fig}-header presentation`,
        content: LOCALE.SYNC_OPTIONS_TIPS
      }),
      Skeletons.Box.X({
        className: `${fig}-header tabs`,
        kidsOpt: {
          radio: `${ui.cid}-radio`,
        },
        kids: [
          Skeletons.Note({
            className: `${fig}-header tab`,
            content: LOCALE.CHANGES_ON_LOCAL_COMPUTER,
            initialState: remote_tab,
            service: 'show-changelog',
            tab: 'remote'
          }),
          Skeletons.Note({
            className: `${fig}-header tab`,
            content: LOCALE.CHANGES_ON_DRUMEE_CLOUD,
            initialState: remote_tab ^ 1,
            service: 'show-changelog',
            tab: 'local'
          }),
        ]
      })
    ]
  })

  return Skeletons.Wrapper.Y({
    className: `${fig}__main`,
    kids: [header, content]
  })
}

module.exports = main;

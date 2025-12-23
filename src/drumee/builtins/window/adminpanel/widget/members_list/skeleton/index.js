
function __skl_members_list(ui) {
  const listFig = ui.fig.family;

  let tagName = ui.mget(_a.name) || LOCALE.ALL_MEMBERS;
  let tagType = ui.mget(_a.type) || 'allMembers';

  const header = Skeletons.Box.X({
    className: `${listFig}__header`,
    kids: [
      Skeletons.Note({
        className: `${listFig}__note title`,
        content: tagName
      }),

      require('./add-menu').default(ui)
    ]
  });

  const separator = Skeletons.Box.X({
    className: `${listFig}__separator`
  });

  const contentFig = `${listFig}-content`;
  let noContentText = LOCALE.NO_MEMBERS_YET
  if (ui._type === 'allAdmins') {
    noContentText = LOCALE.NO_ADMINS_YET
  }

  const content = Skeletons.Box.X({
    className: contentFig,
    radio: 'member_selected_' + ui.mget(_a.widgetId),
    isPlaceholder: true,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__items`,
        kids: [
          Skeletons.Box.X({
            className: `${contentFig}__item`,
            kids: [

              Skeletons.Button.Svg({
                ico: "editbox_list-circle",
                className: `${contentFig}__icon default-avatar editbox_list-circle`,
              }),

              Skeletons.Note({
                className: `${contentFig}__note name`,
                content: noContentText
              })
            ]
          })
        ]
      })
    ]
  });

  const memberList = Skeletons.List.Smart({
    className: `${contentFig}__item list`,
    placeholder: content,
    spinner: true,
    timer: 50,
    sys_pn: 'list-members',
    api: ui.getAllMembers.bind(ui),
    itemsOpt: {
      kind: 'widget_members_list_item',
      type: ui.mget(_a.type),
      orgId: ui.mget('orgId'),
      service: "show-member-detail",
      radio: 'member_selected_' + ui.mget(_a.widgetId),
      uiHandler: ui.getHandlers(_a.ui)
    }
  });

  return Skeletons.Box.Y({
    className: `${listFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${listFig}__container`,
        kids: [
          header,
          separator,
          memberList
        ]
      })
    ]
  })
}

export default __skl_members_list;
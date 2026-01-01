
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} ui 
 */
function __skl_member_tags(ui) {
  const tagsFig = ui.fig.family;

  const tag_id = ui.mget('radioId') || 'tag_selected' + ui.mget(_a.widgetId);

  let addTagBtn = Skeletons.Box.X({});
  if (Visitor.domainCan(_K.permission.admin_member)) {
    addTagBtn = Skeletons.Button.Svg({
      ico: 'desktop_plus',
      className: `${tagsFig}__icon add-tag desktop_plus`,
      service: 'add-tag',
      uiHandler: ui
    })
  }

  const header = Skeletons.Box.X({
    className: `${tagsFig}__header`,
    kids: [
      Skeletons.Note({
        className: `${tagsFig}__note title`,
        content: LOCALE.SERVICE
      }),
      addTagBtn
    ]
  })

  const separator = Skeletons.Box.X({
    className: `${tagsFig}__separator`
  })

  const contentFig = `${tagsFig}-content`
  const tagList = Skeletons.List.Smart({
    className: `${contentFig}__item list`,
    uiHandler: [ui],
    service: 'tag-list-data',
    flag: 'all',
    timer: 50,
    sys_pn: _a.tags,
    api: ui.getTags.bind(ui),
    itemsOpt: {
      kind: 'widget_member_tag_item',
      orgId: ui.mget('orgId'),
      uiHandler: [ui],
      radio: tag_id
    }
  })

  const allMembers = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container widget-member-tagItem__ui`,
        service: 'show-member-list',
        type: 'allMembers',
        name: LOCALE.ALL_MEMBERS,
        sys_pn: 'all-members',
        uiHandler: [ui],
        radio: tag_id,
        state:1,
        dataset: {
          state: 1,
          radio: _a.on
        },
        kidsOpt: {
          active: 0
        },
        kids: [
          Skeletons.Note({
            className: `${contentFig}__note name`,
            content: LOCALE.ALL_MEMBERS
          })
        ]
      })
    ]
  })

  const allAdmins = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container widget-member-tagItem__ui`,
        service: 'show-member-list',
        type: 'allAdmins',
        sys_pn: 'all-admins',
        name: LOCALE.ALL_ADMINISTRATORS,
        uiHandler: [ui],
        radio: tag_id,
        kidsOpt: {
          active: 0
        },
        kids: [
          Skeletons.Note({
            className: `${contentFig}__note name`,
            content: LOCALE.ALL_ADMINISTRATORS
          })
        ]
      })
    ]
  })

  const archivedMembers = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container widget-member-tagItem__ui`,
        service: 'show-member-list',
        type: _a.archived,
        sys_pn: _a.archived,
        name: LOCALE.ARCHIVES,
        uiHandler: [ui],
        radio: tag_id,
        kidsOpt: {
          active: 0
        },
        kids: [
          Skeletons.Note({
            className: `${contentFig}__note name`,
            content: LOCALE.ARCHIVES
          })
        ]
      })
    ]
  })

  const content = Skeletons.Box.X({
    className: `${contentFig}`,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__items`,
        kids: [
          Skeletons.Box.Y({
            className: `${contentFig}__item`,
            kids: [
              allMembers,
              allAdmins,
              tagList,
              archivedMembers
            ]
          })
        ]
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${tagsFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${tagsFig}__container`,
        kids: [
          header,
          separator,
          content
        ]
      })
    ]
  })

  return a;
}

export default __skl_member_tags;
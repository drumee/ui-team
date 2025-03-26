/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/widget/help-category/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_widget_help_category  (_ui_) {
  const helpCategoryFig = _ui_.fig.family
  let header;
/*  if (_ui_.mget('ord') == 1) {
    header = Skeletons.Box.Y({
      className : `${helpCategoryFig}__header`,
      kids      : [
        Skeletons.Note({
          className : `${helpCategoryFig}__note header`,
          content   :  LOCALE.HELPDESK_DRUMEE_HEADER_NOTE1
        }),

        Skeletons.Note({
          className : `${helpCategoryFig}__note header`,
          content   :  LOCALE.HELPDESK_DRUMEE_HEADER_NOTE2
        })
      ]
    })
  }*/

  const title = Skeletons.Box.X({
    className : `${helpCategoryFig}__title`,
    kids      : [
      Skeletons.Note({
        className : `${helpCategoryFig}__note title`,
        content   : `${_ui_.mget('ord')}. ${_ui_.mget(_a.category)}`
      })
    ]
  })

  const separator = Skeletons.Box.X({
    className : `${helpCategoryFig}__separator`
  })

  const descriptionContent = _ui_.mget('category_desc')
  let description;
  if (!_.isEmpty(descriptionContent)) {
    description = Skeletons.Box.X({
      className : `${helpCategoryFig}__description`,
      kids      : [
        Skeletons.Note({
          className : `${helpCategoryFig}__note description`,
          content   : descriptionContent
        })
      ]
    })
  }

  const list = Skeletons.Box.X({
    className : `${helpCategoryFig}__content`,
    kids      : [
      Skeletons.List.Smart({
        className   : `${helpCategoryFig}__list`,
        sys_pn      : 'helpdesk-item-list',
        spinner     : true,
        flow        : _a.none,
        vendorOpt   : Preset.List.Orange_e,
        kids        : _ui_.mget(_a.metadata),
        uiHandler   : _ui_,
        itemsOpt    : {
          kind        : 'widget_helpdesk_item',
          uiHandler   : _ui_
        }
      })
    ]
  })
 
  const body = Skeletons.Box.Y({
    className : `${helpCategoryFig}__body`,
    kids      : [
      title,
      separator,
      description,
      list
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${helpCategoryFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${helpCategoryFig}__container`,
        kids : [
          header,
          body
        ]
      })
    ]
  })
  
  return a;
}

export default __skl_widget_help_category;
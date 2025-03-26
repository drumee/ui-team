/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_window_helpdesk_content  (_ui_, opt) {
  const contentFig = `${_ui_.fig.family}-content`;
  let list;
  switch(Visitor.profile().profile_type){
    case _a.hub:
      let src = "https://portal.drumee.io/hub/helpdesk-hub.html";
      if(opt && opt.hub){
        src = opt.hub[Visitor.language()] || opt.hub.fr || src;
      }
      list = Skeletons.Box.Y({
        className   : `${contentFig}__list`,
        contentType:'html',
        src,
      })
      break;
    default:
      list = Skeletons.Box.X({
        className : `${contentFig}__body list-container`,
        sys_pn : "list-container",
        kids      : [
          Skeletons.List.Smart({
            className   : `${contentFig}__list`,
            sys_pn      : 'helpdesk-category-list',
            flow        : _a.none,
            spinner     : true,
            bubble      : 0,
            vendorOpt   : Preset.List.Orange_e,
            kids : require('../locale')(Visitor.language()),
            uiHandler   : _ui_,
            itemsOpt    : {
              kind        : 'widget_helpdesk_category',
              uiHandler   : _ui_
            }
          })
        ]
      })
      }


  const footer = Skeletons.Box.X({
    className : `${contentFig}__footer`,
    kids      : [
      Skeletons.Note({
        className : `${contentFig}__note footer`,
        content   : LOCALE.HELPDESK_DRUMEE_FOOTER_INFO
      })
    ]
  })

  let a = Skeletons.Box.Y({
    className  : `${contentFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${contentFig}__container`,
        kids : [
          list,
          footer
        ]
      })
    ]
  })

  return a;
}

export default __skl_window_helpdesk_content;
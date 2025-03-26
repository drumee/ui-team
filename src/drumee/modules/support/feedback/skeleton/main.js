// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') { 
  __dbg_path = 'builtins/support/feedeback/skeleton/main';
}

// ===========================================================
// __feedback_list
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __feedback_list = function(view) {
  const icon_status_options = {
    width   : 36,
    height  : 26,
    padding : "5px 10px"
  };

  const _list = {
    kind      : KIND.list.stream, 
    flow      : _a.vertical,
    //timer     : 1000
    sys_pn    : _a.list, 
    styleOpt  : {
      height    : window.innerHeight-300
    },
    vendorOpt : {
      alwaysVisible : true,
      size      : "2px",
      opacity   : "1",
      color     : "#FF4578",
      distance  : "0",    
      railVisible: true,
      railColor : "#E5E5E5",
      railOpacity: "1"
    },      
    className : "mb-80",
    sys_pn    : _a.content,
    handler   : {
      ui  : view
    },
    itemsOpt  : { 
      kind    : 'feedback_item',
      handler   : {
        ui  : view
      }
    },
       
//    itemsOpt  : require('./row-view')#__locale_row
    api       : {
      service : SERVICE.support.list_feedback,
      page    : 1,
      hub_id  : 'support'
    }
  };

  const a = {
    kind      : KIND.box,
    flow      : _a.vertical,
    className : "translation-locale",
    handler   : {
      ui        : view
    },
    kids      : [
      SKL_Box_H(view, {
        className: "w-100 px-40 auth-people__block mt-22",
        kids: [
          SKL_Box_V(view, {
            className: "w-100",
            kids: [
              SKL_Box_H(view, {
                className: "w-100",
                kids: [
                  SKL_Note(null, "Drumee Users Feedbacks", {
                    className: "content__label pt-10 pb-30 margin-auto"
                  })
                ]
              }),
              // SKL_Box_H(view, {   
              //   className: "w-100"
              //   kids: [
              //     SKL_Note("show-more", "Show more...", {
              //       className: "ml-50 content__label show"
              //     })
              //     SKL_Note("show-all", "Show all", {
              //       className: "ml-50 content__label show"
              //     })
              //     SKL_Note("new-entry", "Add new entry", {
              //       className: "ml-50 content__label add"
              //     })
              //     SKL_Note("build-lex", "Build", {
              //       className: "ml-50 content__label generate"
              //     })
              //   ]
              // })
              SKL_Box_H(view, {
                className: "w-100 feedback",
                kids: [
                  SKL_Note(null, "#", {className: "feedback__number"}),
                  SKL_Note(null, LOCALE.NAME, {className: "feedback__name"}),
                  SKL_Note(null, LOCALE.DATE, {className: "feedback__date"}),
                  SKL_Note(null, LOCALE.FEATURE, {className: "feedback__feature"}),
                  SKL_Note(null, LOCALE.DESCRIPTION, {className: "feedback__description"}),
                  SKL_Note(null, LOCALE.SCREENSHOT, {className: "feedback__screenshot"}),
                  SKL_Note(null, LOCALE.STATUS, {className: "feedback__status"})
                ]
              }),
              _list,
              SKL_Box_H(view, {
                sys_pn: "add-to-list-dynamic-box",
                className: "auth-people__add-modal u-jc-center ",
                wrapper: 1
              })
            ]
          })
        ]
      }),
      SKL_Box_H(view, {
        className: "mb-47 absolute",
        wrapper  : 1,
        sys_pn   : "popup"
      })
    ]
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __feedback_list;

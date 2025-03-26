/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') { 
  __dbg_path = 'desk/project-room/skeleton/search-user';
}

// ===========================================================
// __pr_search_user
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __pr_search_user = function(manager, service, api) {
  if ((api == null)) {
    api = { 
      service   : SERVICE.drumate.my_contacts,
      hub_id    : Visitor.id, 
      page      : 1
    };
  }

  const contacts_found = {
    kind        : KIND.list.stream, 
    flow        : _a.y,
    radiotoggle : _a.parent,
    className   : 'sharee-list my-5',
    sys_pn      : "contacts-found",
    styleOpt    : {
      width     : 260,
      height    : 190
    },
    vendorOpt : {
      alwaysVisible : true,
      size      : "2px",
      opacity   : "1",
      color     : "#FA8540",
      distance  : "2px",    
      railColor : "#E5E5E5"
    }
  };
    // placeholder : SKL_Note(null, 'examplemail@mail.com')

  const search_box = {
    kind        : KIND.search,
    flow        : _a.x,
    className   : "input input--inline input--small share-popup__modal-input ml-30",
    itemsOpt  : {
      kind      : 'media'
    },
    placeholder : 'Name or e-mail',
    listClass   : "found-box",
    justify     : _a.left,
    handler     : {
      uiHandler     : manager
    },
    api,
    signal      : _e.ui.event,
    service     : "found-contacts",
    mode : _a.interactive,
    preselect   : 1,
    styleOpt  : { 
      width   : 200
    },
    name      : "key"
  };
    

  const search_panel = { 
    kind: KIND.box,
    flow: _a.horizontal,
    // className: 'AAAAA'
    active : 1,
    kids: [
      search_box,
      SKL_SVG('desktop_plus', {
        className: 'share-popup__modal-plus ml-16 mt-10'
      }, {
        width: 14,
        height: 14,
        padding: 3
      })
    ]
  };

  const a = { 
    kind: KIND.box,
    flow: _a.vertical,
    className: 'u-ai-center mb-20 ml-16 mr-14',
    kids: [
      search_panel,
      SKL_Box_H(manager, {
        className: 'mb-12',
        kidsOpt: {
          className: 'share-popup__modal-options mx-10 option'
        },
        kids: [
          SKL_SVG('desktop__cog', {
            service: 'sharing-privilege',
            signal : _e.ui.event,
            handler: {
              uiHandler : manager
            },
            radiotoggle: 'quick-options-group'
          }, {
            width: 30,
            height: 30,
            padding: 5
          }),
          SKL_SVG('desktop__chat', {
            service: 'sharing-message',
            radiotoggle: 'quick-options-group'
          }, {
            width: 30,
            height: 30,
            padding: 5
          })
        ]
      }),
      SKL_Box_V(manager, {
        sys_pn: 'quick-share-tabs',
        className: 'w-100'
      }),
      SKL_Note(_e.share, LOCALE.SHARE, {
        className: 'share-popup__modal-btn mt-24',
        service 
      }),

      SKL_Box_V(manager, {
        sys_pn    : "contacts-found-block",
        className : 'share-popup__search',
        wrapper   : 1,
        kids      : [
          SKL_Note(null, LOCALE.MEMBERS, {
            className: 'share-popup__search-label'
          }),
          contacts_found
        ]
      })
    ]
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __pr_search_user;

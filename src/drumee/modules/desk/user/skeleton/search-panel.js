// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/share-box/skeleton/outbound/search-panel';
}

const __list = function (manager) {
  const a = {
    kind: KIND.list.smart,
    wrapper: 1,
    flow: _a.y,
    radiotoggle: _a.parent,
    className: 'sharee-list my-5',
    sys_pn: 'contacts-list',
    styleOpt: {
      width: 260,
      height: 200
    },
    vendorOpt: {
      alwaysVisible: true,
      size: "2px",
      opacity: "1",
      color: "#FA8540",
      distance: "2px",
      railColor: "#E5E5E5"
    }
  };
  return a;
};

// ===========================================================
// _search_box
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __sb_search_panel = function (manager) {
  const search_box = {
    kind: KIND.search,
    flow: _a.x,
    className: "input input--inline input--small share-popup__modal-input ml-30",
    placeholder: LOCALE.EMAIL_OR_IDENT,
    listClass: "found-box",
    justify: _a.left,
    sys_pn: "search-box",
    uiHandler: [manager],
    api: {
      service: SERVICE.drumate.my_contacts,
      hub_id: Visitor.id,
      page: 1
    },
    service: "contacts-found",
    mode: _a.interactive,
    preselect: 1,
    styleOpt: {
      width: 200
    },
    name: "key"
  };


  const search_panel = Skeletons.Box.Y({
    className: "",
    active: 0,
    kids: [
      Skeletons.Box.X({
        kids: [
          search_box,
          Skeletons.Button.Svg({
            ico: 'desktop_plus',
            className: 'share-popup__modal-plus ml-16 mt-10',
            service: "add-sharee-by-click",
            sys_pn: "action-add",
            state: 0,
            styleOpt: {
              width: 14,
              height: 14,
              padding: 3
            }
          }),
          Skeletons.Box.Y({
            className: '',
            wrapper: 1,
            sys_pn: 'tooltips-wrapper'
          })
        ]
      }),
      Skeletons.Box.Y({
        className: "",
        initialState: _a.open,
        kids: [__list(manager)],
        styleOpt: {
          overflow: _a.visible,
          height: _a.auto,
          position: _a.absolute,
          top: 26,
          background: 'white',
          zIndex: 10
        }
      }),
      Skeletons.Box.X({
        className: 'mb-12',
        active: 0,
        kids: [
          Skeletons.Box.X({
            className: 'share-popup__modal-options margin-auto',
            sys_pn: "action-options",
            active: 0,
            state: 0,
            kids: [
              Skeletons.Button.Svg({
                ico: "desktop__cog",
                className: 'mx-10 option',
                signal: _e.ui.event,
                uiHandler: manager,
                service: 'open-permission-tab',
                radiotoggle: 'quick-options-group',
                styleOpt: {
                  width: 30,
                  height: 30,
                  padding: 5
                }
              }),
              Skeletons.Button.Svg({
                ico: "desktop__chat",
                className: 'mx-10 option',
                uiHandler: manager,
                service: 'open-message-tab',
                radiotoggle: 'quick-options-group',
                styleOpt: {
                  width: 30,
                  height: 30,
                  padding: 5
                }
              })
            ]
          })
        ]
      })
    ]
  });
  const a = {
    kind: KIND.box,
    flow: _a.vertical,
    className: 'u-ai-center mb-20 ml-16 mr-14',
    active: 0,
    kids: [
      search_panel,
      Skeletons.Box.Y({
        className: "u-ai-center",
        sys_pn: 'options-wrapper',
        wrapper: 1
      }),
      Skeletons.Box.X({
        className: '',
        sys_pn: 'main-buttons-wrapper',
        kids: [
          SKL_Note(_e.close, LOCALE.CANCEL, {
            className: 'share-popup__modal-cancel mt-24 mr-20'
          }),
          SKL_Note(null, LOCALE.SHARE, {
            className: 'share-popup__modal-btn mt-24',
            state: 0,
            sys_pn: "action-share",
            service: "send-invitation"
          })
        ]
      })
    ]
  };
  return a;
};
module.exports = __sb_search_panel;

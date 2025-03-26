// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/admin/members/skeleton/main
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __hub_admin_members
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __hub_admin_members = function(manager) {  
  const close_modal = SKL_SVG("account_cross", {
    //className : "share-popup__modal-close"
    className : "dialog__button--close",
    service   : _e.close
  }, {
    width: 36,
    height: 36,
    padding: 12
  });
  const hidden = 
    {display : _a.none}; 
  const list = Skeletons.List.Smart({ 
    //kind      : KIND.list.stream
    flow      : _a.vertical,
    className : `${manager.fig.family}__list pt-23 pl-14 pb-10`,
    debug     : __filename,
    styleOpt  : {
      width   : 260,
      height  : 88
    },
    vendorOpt : {
      alwaysVisible : true,
      size      : "2px",
      opacity   : "1",
      color     : "#FA8540",
      distance  : "2px",    
      railColor : "#DDE2E8",
      railVisible: true
    },
    kids      : [
      Skeletons.Note({
        //className:"project-room__information-header mb-8"
        className:`${manager.fig.family}__label mb-8`,
        content  : LOCALE.OWNER,
        sys_pn : "ref-owner"
      }),
      Skeletons.Wrapper.Y({
        name: "owner",
        part  : manager
      }),
      Skeletons.Note({
        //className:"project-room__information-header my-8"
        className:`${manager.fig.family}__label my-8`,
        content  : LOCALE.ADMINISTRATOR,
        sys_pn   : "ref-admin",
        state    : _a.closed
      }),
      Skeletons.Wrapper.Y({
        name: "admin",
        part  : manager
      }),
      Skeletons.Note({
        content   : LOCALE.MEMBERS,
        //className :"project-room__information-header my-8"
        className :`${manager.fig.family}__label my-8`,
        sys_pn    : "ref-member",
        state     : _a.closed
      }),
      Skeletons.Wrapper.Y({
        name  : "member",
        part  : manager
      })
    ]});

  const a = [
    close_modal, 
    list
  ];
  return a; 
};
module.exports = __hub_admin_members;

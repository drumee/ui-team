// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/information
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_information
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __project_room_information = function(hub, rights) {  
  const close_modal = SKL_SVG("account_cross", {
    className : "share-popup__modal-close",
    service: 'close-popup'
  }, {
    width: 36,
    height: 36,
    padding: 12
  });

  // hub_owner = hub.model.get(_a.owner)
  // _dbg 'hub_owner', rights

  const email = hub.owner.get(_a.email);
  const days = "2";
  const hours = "8";
  
  const a = { 
    kind      : KIND.box,
    className : "project-room__modal-wrapper project-room__information pt-15 px-14 pb-10",
    styleOpt  : {
      width   : 180
    },
    kids      : [
      close_modal,
      SKL_Note(null, "LOCALE.OWNER", {className:"project-room__information-header mb-8"}),
      SKL_Box_H(hub, {
        className: "mb-11 u-ai-center",
        kids: [
          SKL_Box_H(hub, {
            className:"project-room__information-avatar mr-10 ml-4",
            sys_pn:"test"
          }),
          SKL_Note(null, email, {className:"project-room__information-text"})
        ]
      }),
      SKL_Note(null, LOCALE.PRIVILEGE, {className:"project-room__information-header mb-8"}),
      SKL_Note(null, rights, {className:"project-room__information-text mb-8"}),
      SKL_Box_H(hub, {
        kids: [
          SKL_Note(null, "*for:", {className:"project-room__information-label mr-4"}),
          SKL_Note(null, days, {className:"project-room__information-num mr-4"}),
          SKL_Note(null, LOCALE.DAYS, {className:"project-room__information-label mr-4"}),
          SKL_Note(null, hours, {className:"project-room__information-num mr-4"}),
          SKL_Note(null, LOCALE.HOURS, {className:"project-room__information-label"})
        ]
      })
    ]
  };
    
  return a;
};
module.exports = __project_room_information;

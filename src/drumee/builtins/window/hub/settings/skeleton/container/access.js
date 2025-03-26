// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/admin/settings/skeleton/members
//   TYPE : Skeleton
// ==================================================================== *

// ===========================================================
// __hub_settings_access
//
// @param [Object] hub
//
// @return [Object] 
//
// ===========================================================
const __hub_settings_access = function(hub) { //list_of_admins
  const add_icon = {
    width   : 14,
    height  : 14,
    padding : 3
  };
  const a = Skeletons.Box.Y({
    className: `${hub.fig.family}__container--access-control w-100 px-18`,
    debug : __filename,
    kids: [
      Skeletons.Box.X({
        className: "mb-12",
        kids: [
          Skeletons.Box.X({
            className: "pl-16",
            kids: [
              Skeletons.Note({
                className: "label",
                content: LOCALE.SHARED_CONTACTS_LIST
              }),
              Skeletons.Button.Icon({
                ico :"desktop_plus",
                className : "icon share-popup__modal-plus ml-14", // u-as-end
                service   : "contact-list"
              }, add_icon)
            ]
          }),
          Skeletons.Note({
            //className: "#{hub.prefix}__list-access-header"
            className: "label",
            content: LOCALE.SPECIFIC_ACCESS
          })
        ]
      })
    ]
  });
  a.debug = __filename;
  return a;
};
module.exports = __hub_settings_access;

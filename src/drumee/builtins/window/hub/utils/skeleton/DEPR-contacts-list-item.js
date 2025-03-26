// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/contacts-list-item
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __contacts_list_item
//
// @param [Object] manager
//
// @return [Object] 
//
// ===========================================================
const __contacts_list_item = function(manager, data) {
  let actions, priv_text;
  const edit_icon = { 
    width   : 20,
    height  : 20,
    padding : 3
  };

  const fullname = data.firstname + " " + data.lastname;

  const privilege = parseInt(data.privilege);
  switch (privilege) {
    case 1:
      priv_text = LOCALE.VIEW;
      break;
    case 2: 
      priv_text = LOCALE.DOWNLOAD;
      break;
    case 15: 
      priv_text = "Administrator";
      break;
    case 16:
      priv_text = LOCALE.MODIFY;
      break;
    case 63: 
      priv_text = "Owner";
      break;
    default: 
      priv_text = "Undefined";
  }
  
  if (privilege === 63) {
    actions = SKL_Box_H(manager, {kids: []});
  } else { 
    actions = SKL_Box_H(manager, {
      className: 'project-room__list-item-actions',
      kids: [
        SKL_SVG('desktop_sharebox_edit', {
          className: "ml-20",
          service: "user-rights"
        }, edit_icon),
        SKL_SVG('desktop_delete', {
          className : "ml-20",
          service   : "user-delete",
          id        : data.id 
        }, edit_icon)
      ]
    });
  }

  const a = SKL_Box_H(manager, {
    className: 'project-room__list-item u-ai-center',
    kids: [
      SKL_Note(null, fullname, {className: 'project-room__list-contact pl-16'}),
      SKL_Box_H(manager, {
        className: 'project-room__list-access u-ai-center u-jc-sb',
        kids: [
          SKL_Note(null, priv_text, {className: ""}),
          actions
        ]
      })
    ]
  });

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/contacts-list-item'); }
  return a;
};
module.exports = __contacts_list_item;

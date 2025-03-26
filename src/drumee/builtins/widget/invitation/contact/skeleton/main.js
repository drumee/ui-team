/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/contact/item/skeleton/main.coffee
//   TYPE : Skelton
// ==================================================================== *


const __sb_contact=function(_ui_){
  let a, name;
  const data = _ui_.model.toJSON();
  if (data.email === "*") {
    name = LOCALE.OPEN_LINK;
  } else if ((!_.isEmpty(data.firstname)) || (!_.isEmpty(data.laststname))) {
    name = data.firstname + " " + ((data.lastname != null) ? data.lastname : "");
  } else { 
    name = data.email; 
  }

  // fname = _ui_.mget(_a.firstname)  || ''
  // lname = _ui_.mget(_a.lastname)  || ''
  // fullname = _ui_.mget(_a.fullname) || fname  + " " + lname
  // displayName = _ui_.mget(_a.surname) || _ui_.mget('display')

  // status = _ui_.mget('status')
  // if status is _a.active || status is 'informed'
  //   profile_icon = Skeletons.UserProfile
  //     className   : "#{data.figPrefix}__avatar" #"#{contentFig}__profile"
  //     id          : _ui_.mget(_a.entity) || _ui_.mget(_a.id) || _ui_.mget('drumate_id')
  //     firstname   : fname || displayName
  //     lastname    : lname
  //     fullname    : fullname
  //     online      : _ui_.mget(_a.online)
  //     live_status  : 1
  // else 
  //   profile_icon = Skeletons.Button.Svg
  //     ico       : 'desktop_contactbook'
  //     className : "#{contentFig}__icon profile-icon desktop_contactbook"

  const user = SKL_Box_H(_ui_, {
    className : "invite-contact",
    service   : "select-contact",
    debug     : __filename,
    kids: [                
      Skeletons.Note({
        className: `${data.figPrefix}__avatar`,
        styleOpt: {
          "background-image"   : `url(${_ui_.url})`
        }
          // "background-size"    : "cover"
          // "background-repeat"  : "no-repeat"
          // "background-position": _K.position.center
      }),
      Skeletons.Note({
        content : name,
        className: `${data.figPrefix}__item`
      }),
      SKL_SVG("desktop_preview-contacts", {
        className  : "share-popup__modal-icon clickable", 
        service    : _e.view,
        signal     : _e.ui.event,
        state      : view_state,
        handler    : {
          uiHandler    : _ui_
        }
      }, {
        width: 30,
        height: 30,
        padding: 2
      }),
      SKL_SVG("account_cross", {
        className  : "share-popup__modal-close", 
        service    : _a.remove,
        signal     : _e.ui.event,
        state      : admin_state,
        handler    : {
          uiHandler    : _ui_
        }
      }, {
        width: 30,
        height: 30,
        padding: 11
      })
    ]
  });


  return a = [
    user,
    Skeletons.Box.Y({
      className : "",
      sys_pn    : "options-content",
      active    : 0,
      wrapper   : 1
    })
  ];
};
module.exports = __sb_contact;

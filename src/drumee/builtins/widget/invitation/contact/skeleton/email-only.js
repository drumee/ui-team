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


const __contact_readonly=function(manager){
  let a, name;
  const data = manager.model.toJSON();
  if (data.email === "*") {
    name = LOCALE.OPEN_LINK;
  } else if ((!_.isEmpty(data.firstname)) || (!_.isEmpty(data.laststname))) {
    name = data.firstname + " " + ((data.lastname != null) ? data.lastname : "");
  } else { 
    name = data.email; 
  }

  const user = SKL_Box_H(manager, {
    className : "invite-contact",
    service   : "select-contact",
    debug     : __filename,
    kids: [                
      SKL_Note(null, "", { 
        className: "share-info__avatar",
        styleOpt: {
          "background-image"   : `url(${manager.url})`,
          "background-size"    : "cover",
          "background-repeat"  : "no-repeat",
          "background-position": _K.position.center
        }
      }),
      Skeletons.Note({
        content : name,
        className: `${data.figPrefix}__item`
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
module.exports = __contact_readonly;

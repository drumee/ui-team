// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/settings/invitation/contact/skeleton/view-only
//   TYPE : Skelton
// ==================================================================== *

const __contact_name_only=function(manager){
  let name;
  const data = manager.model.toJSON();
  if (data.email === "*") {
    name = LOCALE.OPEN_LINK;
  } else { 
    name = data.email; 
  }
  const a = Skeletons.Box.X({
    className : `${manager.fig.prefix}__member member`,
    service   : "select-contact",
    uiHandler     : manager,
    debug     : __filename,
    kids: [                
      Skeletons.Note({ 
        className: `${manager.fig.prefix}__avatar avatar`,
        styleOpt: {
          "background-image"   : `url(${manager.url})`
        }
      }),
      Skeletons.Note({
        className: `${manager.fig.prefix}__name name`,
        content : name,
        active  : 0
      })
    ]
  });

  return a;
};
module.exports = __contact_name_only;

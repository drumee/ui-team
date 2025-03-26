const { timestamp } = require("core/utils")

let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/user/skeleton/main';
}


const __recipient_main=function(manager){
  let name;
  const data = manager.model.toJSON();
  if (data.email === '*') {
    name = LOCALE.OPEN_LINK;
  } else if ((!_.isEmpty(data.firstname)) || (!_.isEmpty(data.laststname))) {
    name = data.firstname + ' ' + ((data.lastname != null) ? data.lastname : '');
  } else { 
    name = data.email; 
  }
  _dbg(`aaaaaa 31bbbbbbbb 12 name=${name}`, data); 
  //url = "#{URL_BASE}avatar/#{id}?#{timestamp()}"
  const a = SKL_Box_H(manager, {
    className : 'invite-contact',
    service   : "select-recipient",
    kids: [                
      SKL_Note(null, '', { 
        className: "share-info__avatar",
        styleOpt: {
          'background-image'   : `url(${manager.url})`,
          'background-size'    : "cover",
          'background-repeat'  : "no-repeat",
          'background-position': _K.position.center
        }
      }),
      SKL_Note(null, name, {className: 'sharee-new-contact__item'}),
      SKL_SVG("account_cross", {
        className  : "share-popup__modal-close", 
        service    : "remove-recipient",
        uid        : data.entity_id,
        signal     : _e.ui.event,
        email      : data.email,
        content    : name,
        permission : data.permission,
        handler    : {
          uiHandler    : manager
        }
      }, {
        width: 30,
        height: 30,
        padding: 11
      })
    ]
  });
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __recipient_main;

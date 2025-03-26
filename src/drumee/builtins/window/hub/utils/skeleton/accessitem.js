const { timestamp } = require("core/utils")
const _access_item = function(manager, data) {
  let actions;
  _dbg("zzzzzzzzzzzzzzz", data);
  const {
    email
  } = data;
  const entity_id = data.id;
  // privilege = require('./privilege')(@)
  if (parseInt(data.privilege) & _K.permission.owner) { 
    actions = SKL_Box_H(manager, {});
  } else { 
    actions = SKL_Box_H(manager, {
      className: 'sharee-contact__icon',
      kids: [
        SKL_SVG('editbox_cog', {
          className : 'sharee-contact__icon-item',
          service   : 'share-options',
          entity_id,
          email
        }, {
          width: 16,
          height: 16,
          padding: 0
        }),
        SKL_SVG('desktop_delete', {
          className : 'sharee-contact__icon-item',
          service   : 'remove-admin',
          entity_id,
          signal    : _e.ui.event,
          handler   : {
            uiHandler     : manager
          }
        }, {
          width: 16,
          height: 16,
          padding: 0
        })
      ]
    });
  }

  const url = `${location.origin}${location.pathname}avatar/${entity_id}?${timestamp()}`;
  const a = SKL_Box_H(manager, {
    className : 'sharee-contact access-item',
    kids: [
      SKL_Note(null, '', { 
        className: "share-info__avatar",
        styleOpt: {
          'background-image'   : `url(${url})`,
          'background-size'    : "cover",
          'background-repeat'  : "no-repeat",
          'background-position': _K.position.center
        }
      }),
      SKL_Note(null, email, {
        className : 'sharee-contact__email'
      }),
      actions
    ]
  }); 
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/accessitem'); }
  return a;
};
module.exports = _access_item;

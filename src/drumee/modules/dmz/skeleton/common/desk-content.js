// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/sharebox/skeleton/desk-content.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_desk_content (_ui_) {

  const deskFig = `${_ui_.fig.family}-desk`
  let privilege = _ui_.mget(_a.privilege);
  if(privilege > _K.privilege.write) privilege = _K.privilege.write;
  let api = null;
  if(_ui_.nodeInfoService ==  SERVICE.media.show_node_by){
    api = { 
      service       : _ui_.nodeInfoService,
      nid           : _ui_.mget(_a.nid),
      share_id      : _ui_.mget(_a.share_id),
      recipient_id  : _ui_.mget(_a.user_id),
      page : 1
    }  
  }

  const a = Skeletons.Box.Y({
    className : `${deskFig}__container`,
    debug     : __filename,
    kids      : [

      Skeletons.FileSelector({
        partHandler : _ui_
      }),
      
      Skeletons.Box.Y({
        className : `${deskFig}__wrapper desk-wrapper`,
        sys_pn    : 'desk-wrapper',
        kids      : [{
          kind       : 'dmz_window_manager',  
          className  : `${_ui_.fig.family}__content desk-content`,
          sys_pn     : 'desk-content',
          origin     : _a.dmz,
          desk       : _ui_,
          uiHandler  : _ui_,
          hub_id     : _ui_.mget(_a.hub_id),
          home_id    : _ui_.mget(_a.nid), //_ui_.mget(_a.home_id),
          nid        : _ui_.mget(_a.nid),
          token      : _ui_.mget(_a.token),
          privilege,
          api
        }]
      })
    ]
  });

  return a;

};

module.exports = __skl_dmz_desk_content;
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// _icon
//
// @param [Object] contact
//
// @return [Object] 
//
// ===========================================================
const __media=function(_ui_){
  const a = {
    kind      : "thumbnail",
    category  : _ui_.mget(_a.category),
    hub_id    : _ui_.mget(_a.hub_id),
    nid       : _ui_.mget(_a.nodeId),
    share_id  : _ui_.mget(_a.share_id),
    styleOpt  : { 
      width   : 32,
      height  : 26,
      padding : 0
    }
  };
  return a; 
};

// ===========================================================
//
// ===========================================================
const __skl_inbound_sharer = function(_ui_) {
  const data   = _ui_.model.toJSON();
  const icon_options = { 
    width: 18,
    height: 18,
    padding: 0
  };

  const a = Skeletons.Box.X({
    debug      : __filename,
    className  : `${_ui_.fig.family}__main`,
    kids: [
      Preset.Button.Close(_ui_),
      __media(_ui_),
      Skeletons.Note({
        content   : data.email,
        className : `${_ui_.fig.family}__email`        
      }),      
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__icon-block`,
        kids: [
          Skeletons.Button.Icon({
            ico:"desktop__chat",
            className : `${_ui_.fig.family}__icon ${_ui_.fig.family}__icon--chat chat`,
            service   : "show-inbound-msg",
            uiHandler     : _ui_, 
            flyover   : { 
              delay   : 3300,
              mouseenter : { 
                service  : "show-inbound-msg"
              },
              mouseleave : { 
                service  : "hide-inbound-msg"
              }
            },
            name         : "message",
            message      : data.message || "No message"
          }, icon_options),
          Skeletons.Note({
            content   : LOCALE.OK,
            className : `${_ui_.fig.family}__ok-btn check`, 
            service   : "accept_notification",  
            name      : "accept",
            uiHandler     : _ui_,
            value     : {  
              ownerid : data.hub_id,
              nid     : data.nid
            }     
          }),      
          Skeletons.Button.Icon({
            ico       : "desktop_delete",
            className : `${_ui_.fig.family}__icon ${_ui_.fig.family}__icon--reject reject`,
            signal    : _e.ui.event,
            service   : "refuse_notification",
            name      : "refuse",
            uiHandler : _ui_, 
            value : {  
              ownerid : data.hub_id,
              nid     : data.nid
            }
          }, icon_options)
        ]
      })
    ]
  });
  return a; 
};
module.exports = __skl_inbound_sharer;

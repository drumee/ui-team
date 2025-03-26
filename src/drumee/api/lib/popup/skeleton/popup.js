// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/popup/skeleton/popup.coffee
//   TYPE : Skeleton
// ==================================================================== *

const { timestamp } = require("core/utils")
const __welcome_default = function(_ui_) {

  const content = _ui_.mget('popup-content') || _ui_.mget('popupContent');
  const action = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__action-wrapper`,
    sys_pn    : "action-wrapper",
    kids      : [
      Skeletons.Button.Svg({
        ico        : _a.cross,
        src        : `https://${bootstrap().main_domain}/-/images/icons/cross.svg`, 
        className  : "icon ctrl-close",
        service    : _e.close,
        uiHandler  : _ui_
      })
    ]});
  
  // _ui_.mget('popup-content')

  const body  = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__popup-body-container`,
    sys_pn    : "popup-body-container",
    kids      : [
      content ?
        {
          kind: content,
          uiHandler  : _ui_
        } : undefined
    ]});

  const probe = _ui_.mget('probe');
  const loc = _ui_.mget('probe-id') || "x";
  const analyticsInfo = _ui_.mget('analytics');
  try { 
    const origin = window.raw_referer || location.origin; 
    const url = new URL(origin);
    const {
      xid
    } = Visitor.parseLocation();
    let src = '';
    if (probe || xid) {
      if (probe) {
        src = `${probe}&referer=${url.host}&nid=${loc}&ts=${timestamp()}`;
      }
      if (xid) {
        src = `${src}&xid=${xid}`;
      }
      
      if (analyticsInfo) {
        src = `${src}&${analyticsInfo}`;
      }

      body.kids.push(Skeletons.Element({
        tagName:_K.tag.img,
        attribute: {
          src
        },
        style: {
          display : _a.none
        }
      })
      );
    }
  } catch (e) {
    console.warn(e);
  }


  const a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${_ui_.fig.family}__popup-wrapper`,
    kids      :[
      action,
      body
    ]});
  return a;
};

module.exports = __welcome_default;

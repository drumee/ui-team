// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/form/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

const { timestamp } = require("core/utils")
const __api_form = function(_ui_) {

  let body  = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__entry-container`,
    sys_pn    : "body-container",
    kids      : [
      require('./content')(_ui_)
    ]});
  
  // to construct media.xl for analytics purpose
  const probe = _ui_.mget('probe');
  const loc = _ui_.mget('probe-id') || 'x';
  const analytics = Visitor.parseLocation();
  try {
    const origin = window.raw_referer || location.origin;
    const url = new URL(origin);
    const xid = Visitor.parseLocation().xid;
    let src;

    if(probe || xid) {
      if(probe) {
        src = `${probe}&referer=${url.host}&nid=${loc}&ts=${timestamp()}`;
      }
      
      if(xid) {
        src = `${src}&xid=${xid}`;
      }

      if(analytics.info) {
        const page = analytics.type || 'home';
        const section = analytics.section || 'banner';
        const area = analytics.area || 'pro';
        src = `${src}&page=${page}&section=${section}&area=${area}`;
      }

      const mediaEl = Skeletons.Element({
        tagName   : _K.tag.img,
        attribute : {
          src : src
        },
        style     : {
          display : _a.none
        }
      });

      body.kids.push(mediaEl);
    }
  } catch (e) {
    console.warn(e)
  }

  const a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${_ui_.fig.family}__main`,
    kids      :[body]
  });
  return a;
};
module.exports = __api_form;

const { timestamp } = require("core/utils")
const __api_image_tag = function(_ui_) {

  let body  = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__entry-container`,
    sys_pn    : "body-container",
    kids      : []
  });
  
  // to construct media.xl for analytics purpose
  const probe = _ui_.mget('probe');
  const loc = _ui_.mget('probe-id') || 'x';
  const analytics = _ui_.mget('analytics');

  try {
    const origin = window.raw_referer || location.origin || 'https://drumee.com';
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

      if(analytics) {
        src = `${src}&${analytics}`;
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

export default __api_image_tag;

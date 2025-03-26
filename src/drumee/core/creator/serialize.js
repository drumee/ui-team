
const { isNumeric } = require("core/utils")

const __serialize = function(c) {
  const m = c.model;
  const attr = m.toJSON() || {kind:KIND.note};
  delete attr.kidsOpt;
  delete attr.respawnOpt;
  delete attr.respawn;
  delete attr.handler;
  delete attr.mapName;

  if (c.style) {
    attr.styleOpt = c.style.toJSON();
  }

  if (c.mobile) {
    attr.styleMobile = c.mobile.toJSON();
  }

  if (c.icon) {
    attr.styleIcon   = c.icon.toJSON();
  }

  if (c.data) {
    attr.dataOpt   = c.data.toJSON();
  }

  if (c.pseudo) {
    attr.stylePseudo = c.pseudo.toJSON();
  }

  if (c.attributes) {
    attr.attrOpt  = c.attributes.toJSON();
  }

  return attr;
};


// ======================================================
//
// ======================================================
Marionette.View.prototype.toLETC = function() {
  if (this.isDestroyed() || (this.model == null)) {
    return null;
  }
  const r = __serialize(this);
  if ((this.children == null)) {
    return r; 
  }
  let i = 1000; 
  r.kids = [];
  this.children.each(function(c){
    const kid = c.toLETC();
    if (!kid) { 
      return null; 
    }
    if (r.rank != null) { 
      kid.rank = r.rank + 1;
    }
    let index = c.getActualStyle(_a.zIndex);
    if (isNumeric(index)) {
      index = ~~index;
    } else { 
      index = i; 
    }
    i = Math.max(i+1, index);
    kid.styleOpt = kid.styleOpt || {};
    kid.styleOpt.zIndex = index;
    return r.kids.push(kid);
  });
  return r; 
};

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
//-----------------------------------
//  Copyright Thidima SA
//  Proxy module
//  Mixins export, to be imported as on demand methods
//-----------------------------------


// ========================
//
// ========================
Marionette.View.prototype.respawn = function(data) {
  let k, v;
  if (data.styleIcon != null) {
    if ((this.icon == null)) {
      this.icon = new Backbone.Model(data.styleIcon);
    } else { 
      for (k in this.icon.attributes) {
        v = this.icon.attributes[k];
        if ((data.styleIcon[k] == null)) {
          this.icon.unset(k);
        }
      }
      for (k in data.styleIcon) {
        v = data.styleIcon[k];
        this.icon.set(k, data.styleIcon[k]);
      }
    }
  } else { 
    if (this.icon != null) {
      this.icon.clear();
    }
  }

  if (data.styleOpt != null) {
    for (k in this.style.attributes) {
      v = this.style.attributes[k];
      if ((data.styleOpt[k] == null)) {
        this.style.unset(k);
      }
    }
    for (k in data.styleOpt) {
      v = data.styleOpt[k];
      this.style.set(k, data.styleOpt[k]);
    }
  } else { 
    this.style.clear();
  }

  if (data.dataOpt != null) {
    if ((this.data == null)) {
      this.data = new Backbone.Model(data.dataOpt);
    } else { 
      for (k in this.data.attributes) {
        v = this.data.attributes[k];
        if ((data.dataOpt[k] == null)) {
          this.data.unset(k);
        }
      }
      for (k in data.dataOpt) {
        v = data.dataOpt[k];
        this.data.set(k, data.dataOpt[k]);
      }
    }
  } else { 
    if (this.data != null) { 
      this.data.clear();
    }
  }

  if (data.schemaOpt != null) {
    if ((this.chema == null)) {
      this.chema = new Backbone.Model(data.schemaOpt);
    } else { 
      for (k in this.schema.attributes) {
        v = this.schema.attributes[k];
        if ((data.schemaOpt[k] == null)) {
          this.schema.unset(k);
        }
      }
      for (k in data.schemaOpt) {
        v = data.schemaOpt[k];
        this.schema.set(k, data.schemaOpt[k]);
      }
    }
  } else { 
    if (this.schema != null) { 
      this.schema.clear();
    }
  }

  if (data.attrOpt != null) {
    if ((this.attribute == null)) {
      this.attribute = new Backbone.Model(data.attrOpt);
    } else {
      for (k in this.attribute.attributes) {
        v = this.attribute.attributes[k];
        if ((data.attrOpt[k] == null)) {
          this.attribute.unset(k);
        }
      }
      for (k in data.attrOpt) {
        v = data.attrOpt[k];
        this.attribute.set(k, data.styleOpt[k]);
      }
    }
  } else { 
    if (this.attribute != null) { 
      this.attribute.clear();
    }
  }

  if (data.kids != null) {
    return this.model.set(_a.kids, data.kids);
  } else if (this.model.get(_a.kids)) {
    return this.model.unset(_a.kids); 
  }
};

  
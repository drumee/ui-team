class ___privacy_switcher extends LetcBox {

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.declareHandlers();
    
    const p = Visitor.get('privacy') || {};
    return this.mset({ 
      state : ~~p[this.mget(_a.name)]});
  }


// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    // @debug "privacy switcher SERVICE=#{service}", @mget(_a.name), @__switch.mget(_a.state), @

    const p = Visitor.get('privacy') || {};
    p[this.mget(_a.name)] = this.__switch.mget(_a.state);
    Visitor.set({privacy : p});

    return this.postService({ 
      service : SERVICE.drumate.update_profile,
      hub_id  : Visitor.id, 
      profile : {privacy : p}});
  }
}


module.exports = ___privacy_switcher;

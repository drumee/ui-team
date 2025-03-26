class __account_country extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.reload = this.reload.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "account_country";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    return super.initialize();
  }

// ===========================================================
// onDomRefresh
//
// @param [Object] e
//
// ===========================================================
  onDomRefresh() { 
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    return this.reload();
  }

// ===========================================================
//
// @param [Object] e
//
// ===========================================================
  reload() { 
    return this.feed(Skeletons.Note({
      className : `${this.fig.family}__main`,
      content   : this.mget(_a.name) || this.mget('name_en')
    })
    );
  }
}
__account_country.initClass();
    
   

// ===========================================================
// onUiEvent
//
// @return [Object] 
//contacts-found
// ===========================================================
  // onUiEvent:(cmd) =>
  //   service = cmd.status || cmd.service || cmd.model.get(_a.service)
  //   @debug "AAAAAA FFF 96service=#{service}", cmd.model.get(_a.state), @, cmd
  //   @triggerHandlers()
  //   # switch service
  //   #   when _e.edit
  //   #     @_edit(cmd)

  //   #   when _e.cancel
  //   #     @reload()
        
  //   #   when _e.commit, _e.Enter
  //   #     @_commit(cmd)
  //   # super()
      

module.exports = __account_country;

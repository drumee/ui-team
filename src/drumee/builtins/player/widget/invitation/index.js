const mfsInteract = require('../../../window/schedule/widget/invitation/node_modules/window/interact/singleton')
class __schedule_invitation extends mfsInteract {
  
  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.model.atLeast({
      format     : _a.slide,
      autostart  : false,
      mute       : true,
      innerClass : _K.char.empty,
      widgetId   : this._id, 
      fit        : _a.height,
      video      : 0,
      audio      : 1
    });
    this.service_class = 'conference',
    this._configs = {};
    this.logicalParent = this.getHandlers(_a.ui)[0];
    this.mset({
      nid : this.logicalParent.mget(_a.nodeId),
      hub_id : this.logicalParent.mget(_a.hub_id)
    })
    if (this._responsive) RADIO_BROADCAST.on(_e.responsive, this._responsive);
    this.declareHandlers();
  }

    /**
   * 
   */
  addRecipent(item) {
    let opt;
    this.debug(`bbaaaa 81 `, opt, this);
    if(_.isString(item)){
      opt = {id:_.uniqueId('guest-'), email:item};
    }else if(item && item.model){
      opt = item.model.toJSON();
    }
    opt.kind = 'schedule_recipient';
    if(!opt.email || !opt.email.isEmail()){
      if(opt.id && opt.id.isEmail()){
        opt.email = opt.id;
      }else{
        this.warn("INVALID EMAIL", opt);
        return
      }
    }
    let exists = this.__recipientsList.getItemsByAttr(_a.email, opt.email);
    if(exists[0]){
      exists[0].anim([0.3, {scale:0.9, alpha:0.7}], [0.3, {scale:1, alpha:1}]);
      return;
    }
    this.__recipientsList.append(opt);
  }

    /**
   * 
   */
  handleError(args) {
    this.debug(`bbaaaa 81 handleError`, args, this);
    if(args.error){
      this.__wrapperError.feed(
        Skeletons.Note(LOCALE.INVALID_EMAIL_FORMAT, `${this.fig.family}__error`)
      );
    }else{
      this.__wrapperError.clear();
    }
  }  
  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton/index')(this));
    this.setupInteract();
  }


  /** */
  onUiEvent(cmd, args={}) {
    const service = args.service || cmd.service || cmd.model.get(_a.service);
    this.debug(`bbaaaa 81 onUiEvent=${service}`, args, cmd.get(_a.state), cmd, this);
    if(!args.no_raise) this.raise(cmd);
    switch (service) {
      case _a.update:
        this.searchBox = cmd;
        return this.handleError(args);
      case "add-item":
        return this.addRecipent(args.item);
      case "add-selection":
        if(!_.isArray(args.items)) return;
        for(var item of args.items){
          this.addRecipent(item);
        }
        break;
      case _e.send:
        if(this.searchBox && this.searchBox.pendingValue().isEmail()){
          this.addRecipent(this.searchBox.pendingValue(1));
        }
        let emails = [];
        this.__recipientsList.children.each((c)=>{
          
          emails.push({email:c.mget(_a.email), name:c.displayName()});
        });
        let data = this.getData();
        data.emails = emails;
        data.nid = this.mget(_a.nid);
        data.hub_id = this.mget(_a.hub_id);
        this.postService(SERVICE.wicket.create_external_meeting, data).then((opt)=>{
          opt.service = "invitation-sent";
          this.triggerHandlers(opt);
        });
      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   */
  __dispatchRest(service, data){
    this.debug("__dispatchRest GGGF", service, data);
    switch (service) {
      case SERVICE.wicket.create_external_meeting:
    }
  }

  update_attendees(data) {
    this.debug("ATTENDEES", data);
  }


}


module.exports = __schedule_invitation;

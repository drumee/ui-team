class __account_profile extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._showMessge = this._showMessge.bind(this);
    this._commit = this._commit.bind(this);
    this._update = this._update.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._submitData = this._submitData.bind(this);
    this._updateEmail = this._updateEmail.bind(this);
    this._updateProfile = this._updateProfile.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    let c;
    require('./skin');
    super.initialize(opt);
    this.data = Visitor.profile();
    this.data.ident = Visitor.get(_a.username);
    
    if (_.isString(this.data.address)) {
      let address = this.data.address;
      try{
        this.data.address = JSON.parse(address);
      }catch(e){

      }
    }
    
    this.declareHandlers();
    this._input = {};
    this._error = {};
    return c = 1;
  }
    
  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    if (_.isEmpty(this.data.location)) {
      return this.fetchService({service:SERVICE.butler.hello}).then(data=> {
        this.data.location = data;
        return this.feed(require('./skeleton')(this));
      });
    } else { 
      return this.feed(require('./skeleton')(this));
    }
  }

  /**
   * 
   * @param {*} name 
   * @param {*} msg 
   * @returns 
   */
  _showMessge(name, msg) {
    if ((msg == null)) {
      delete this._error[name];
    } else { 
      this._error[name]  = msg;
    }
    return this._input[name].message(msg);
  }


  /**
   * 
   * @returns 
   */
  _commit() {
    const opt = this.getData();
    if (_.isEmpty(opt)) {
      return; 
    }

    const data = {};
    for (let a of [_a.firstname, _a.lastname]) {
      if (!_.isEmpty(opt[a]) && (opt[a] !== Visitor.data(a))) {
        data[a] = opt[a];
      }
    }

    const {
      location
    } = Visitor.profile();
    const str =  opt.location;
    if (_.isObject(location) && (location.string !== str)) {
      location.string = str;
      data.location = location;
    }
    if (_.isEmpty(data)) {
      return; 
    }

    return this.postService({
      service     : SERVICE.drumate.update_profile,
      profile     : data,
      hub_id      : Visitor.id
    }); 
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _update(cmd) {
    const name = cmd.mget(_a.name);
    let v = cmd.getValue();
    v = v.trim();
    if (!_.isEmpty(v)) {
      this._input[name] = cmd;
      if (v !== this.data[name]) {
        this.buttonRef.set({ 
          content : LOCALE.SAVE_CHANGES});
      }
      if (name === _a.location) {
        return this.data[name].string = v; 
      }
    } else {
      return delete this._input[name];
    }
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "ref-validate":
        return this.buttonRef = child;
    }
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.service || cmd.mget(_a.service);

    switch (service) {
      case _e.update:
        return this._update(cmd);

      case _e.submit:
        return this._submitData(args.source);
      
      case _e.commit:
        this._commit();
        if (cmd.source) {
          cmd.source.$el.blur();
          return this._currentInput = cmd.source;
        }
        break;

      case _a.email: case _a.ident: case _a.mobile:
        return this.triggerHandlers({service:"security"});
    }
  }


  /**
   * 
   * @param {*} source 
   * @returns 
   */
  _submitData(source) {
    const name  = source.mget(_a.name);

    let val = source.getData(_a.formItem)[name];
    if (name === _a.address) {
      val = val[0];
    }
    
    if (_.isEqual(val, source.mget(_a.value))) {
      source.render();
      return;
    }
    
    const data = {};
    if (name !== _a.address) {
      if (!_.isEmpty(val) && (val !== Visitor.profile()[name])) {
        data[name] = val;
      }
    } else {
      data[name] = val;
    }

    return this.postService({
      service     : SERVICE.drumate.update_profile,
      profile     : data,
      hub_id      : Visitor.id
    });
  }


  /**
   * 
   * @returns 
   */
  _updateEmail() {
    if ((this.data.email == null)) {
      this._showMessge(_a.email, LOCALE.REQUIRE_THIS_FIELD);
      return; 
    }
    if (!this.data.email.isEmail()) {
      this._showMessge(_a.email, LOCALE.REQUIRE_EMAIL);
      return;
    }

    if ((this.data.password == null)) {
      this._showMessge(_a.email, "Password required");
      return;
    }

    return this.postService({
      service  : SERVICE.drumate.change_email,
      email    : this.data.email,
      password : this.data.password
    });
  }


  /**
   * 
   * @param {*} profile 
   * @returns 
   */
  _updateProfile(profile) {
    return this.postService({
      service     : SERVICE.drumate.update_profile,
      profile
    });
  }




  /**
   * 
   * @returns 
   */
  _updateAck() {
    for (let k in this._input) {
      const v = this._input[k];
      if (this.data[k] === v.getValue()) {
        this._showMessge(k, _a.template);
        delete this._input[k];
      }
    }
  }


  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.drumate.update_profile:
        Visitor.set(_a.profile, data);
        this.data = Visitor.profile();
        return this.render();
        
      case SERVICE.drumate.update_ident:
        data.profile = JSON.parse(data.profile);
        data.settings = JSON.parse(data.settings);
        data.quota = JSON.parse(data.quota);
        Visitor.set(data);
        this.data = Visitor.profile();
        this.data.ident = data.ident;
        return this._updateAck();

      case SERVICE.butler.hello:
        return this.data.location = data;
    }
  }
}

module.exports = __account_profile;

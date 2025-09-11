/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/window/hub/project/project
// ==================================================================== *
//require('./skin')
class __hub_website extends LetcBox {
  // ===========================================================
  // initialize
  // ===========================================================

  constructor(...args) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.onPartReady = this.onPartReady.bind(this);
    this._checkSanity = this._checkSanity.bind(this);
    this._create = this._create.bind(this);
    this._wait = this._wait.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    super(...args);
  }

  initialize() {
    super.initialize();
    require('./skin');
    return this.contextmenuSkeleton = 'a';
  }

  // ===========================================================
  // onDomRefresh
  // ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s { part: @ }
    this.feed(require("./skeleton/main")(this));
    return this._data = {};
  }

  // ===========================================================
  // onPartReady
  // ===========================================================
  onPartReady(child, pn, section) {
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    switch (pn) {
      case "ref-name":
        return this._nameEntry = child;

      case "ref-ident":
        return this._identEntry = child;

      case "ref-commands":
        return this.commandsRef = child;
    }
  }

  // ===========================================================
  // 
  // ===========================================================
  _checkSanity() {
    if (_.isEmpty(this._data.name)) {
      this._nameEntry.showError(LOCALE.REQUIRE_THIS_FIELD);
      this.commandsRef.el.dataset.active = 0;
      return false;
    }

    if (Wm.filenameExists(this._data.name)) {
      this._nameEntry.showError((`<u>${this._data.name}</u>`.printf(LOCALE.NAME_ALREADY_EXISTES)));
      this.commandsRef.el.dataset.active = 0;
      return false;
    }

    this._nameEntry.hideError();

    if (_.isEmpty(this._data.ident)) {
      this._identEntry.showError(LOCALE.REQUIRE_THIS_FIELD);
      this.commandsRef.el.dataset.active = 0;
      return false;
    }

    this._nameEntry.hideError();
    this._data.error = false;
    this.commandsRef.el.dataset.active = 1;

    return true;
  }

  // ===========================================================
  // 
  // ===========================================================
  _create(cmd) {
    if (this.phase === _a.creating) {
      this.warn("Waiting for hub to be instanciated");
      return;
    }
    this.phase = _a.creating;
    this.postCreation = cmd.model.get(_a.mode);
    return this.postService(SERVICE.desk.create_hub, {
      area: _a.public,
      filename: this._data.name,
      hub_id: Visitor.id,
      hubname: this._data.ident,
      pid: this.mget(_a.nid),
      folders: [
        LOCALE.PICTURES,
        LOCALE.DOCUMENTS,
        LOCALE.VIDEOS,
        LOCALE.MUSICS
      ]
    });
  }

  // ===========================================================
  // 
  // ===========================================================
  _wait() {
    return this.getPart(_a.body).feed(require('./skeleton/wait')(this));
  }

  // ===========================================================
  // onUiEvent
  // ===========================================================
  onUiEvent(cmd) {
    const service = cmd.model.get(_a.service);
    //@debug "aaaa 112 svc=#{service}", cmd, @, cmd.status, cmd.results
    switch (service) {
      case _e.close:
        return this.softDestroy();

      case 'hub-name':
        this._data.name = cmd.mget(_a.value);
        if (Wm.filenameExists(this._data.name)) {
          this._nameEntry.showError((`<u>${this._data.name}</u>`.printf(LOCALE.NAME_ALREADY_EXISTES)));
          this.commandsRef.el.dataset.active = 0;
        } else {
          this._nameEntry.hideError();
        }

        if (!_.isEmpty(this._data.name) && !_.isEmpty(this._data.ident)) {
          return this.commandsRef.el.dataset.state = 1;
        }
        break;

      case 'hub-ident':
        this.debug("aaaa 96", cmd.status, cmd.results);
        if (cmd.status === _a.error) {
          commandsRef.el.dataset.state = 0;
          this._data.ident = null;
          return;
        }
        if (~~cmd.results.available) {
          this._data.ident = cmd.results.ident;
          if (!_.isEmpty(this._data.name) && !_.isEmpty(this._data.ident)) {
            this.commandsRef.el.dataset.state = 1;
            return this.findPart('wrapper-tooltips').clear();
          }
        } else {
          const message = Skeletons.Note((cmd.results.ident), "warning".printf(LOCALE.NOT_AVAILABLE));
          this.findPart('wrapper-tooltips').feed(message);
          this._data.ident = null;
          return this.commandsRef.el.dataset.state = 0;
        }
        break;

      case _e.create:
        this.debug("aaaa CR", cmd);
        if (this._checkSanity()) {
          return this._create(cmd);
        }
        break;
    }
  }

  // ===========================================================
  //
  // @param [Object] method
  // @param [Object] data
  // @param [Object] socket
  //
  // @return [Object] 
  //
  // ===========================================================
  __dispatchRest(method, data, socket) {
    //@debug "AAAAAAAAAAAAAA 731", method, data, socket
    switch (method) {
      case SERVICE.desk.create_hub:
        this.model.set(data);
        var {
          vhost
        } = data;
        location.href = `${protocol}://${vhost}${location.pathname}#/${this.postCreation}`;
        this.phase = null;
        return this.softDestroy();
      case SERVICE.desk.create_website:
        if (_.isEmpty(this._data.users)) {
          this.softDestroy();
          this.onAfterHubCreation(data);
        } else {
          const opt = {
            service: SERVICE.hub.add_contributors,
            hub_id: data.id,
            message: this._data.message || '',
            users: this._data.users,
            days: this._data.days,
            hours: this._data.hours,
            expiry: this._data.expiry,
            privilege: this._data.permission || _K.privilege.write
          };

          this.postService(opt, { async: 1 }).then((d) => {
            this.onAfterHubCreation(data);
            this.softDestroy();
            return this.triggerHandlers();
          })
        }

        this.new_hub = data;
        return data.kind = _a.media;

    }
  }
}

module.exports = __hub_website;

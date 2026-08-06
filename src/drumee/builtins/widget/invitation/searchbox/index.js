// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/widget/invitation/searchbox/index.js
//   TYPE : Component
// ==================================================================== *
class __invitation_searchbox extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.model.set({
      flow: _a.y
    });
    this._minHeight = 36;
    this._maxHeight = 300;
    this.contactItem = {
      kind: "invitation_recipient",
      service: "add-item",
      type: 'selection',
      ancestor: this.mget(_a.uiHandler),
      uiHandler: this,
      origin: this.mget(_a.origin)
    };
    if (this.mget(_a.itemsOpt)) {
      _.merge(this.contactItem, this.mget(_a.itemsOpt));
    }
    if (this.mget("contactItem")) {
      _.merge(this.contactItem, this.mget("resultItem"));
    }
    this.model.atLeast({
      contactbook: 1,
      persistence: _a.once
    });
    this.declareHandlers();
    RADIO_CLICK.on(_e.click, this._onOutsideClick.bind(this));
  }

  /**
   * 
   */
  onBeforeDestroy() {
    return RADIO_CLICK.off(_e.click, this._onOutsideClick.bind(this));
  }

  /**
   * 
   */
  getSharees() {
    let sharees = [];
    try {
      sharees = this.mget(_a.uiHandler).mget(_a.sharees) || [];
    } catch (error) {
      sharees = [];
    }
    return sharees;
  }

  /**
   * 
   * @param {*} e 
   * @param {*} origin 
   */
  _onOutsideClick(e, origin) {
    if (pointerDragged) {
      return;
    }
    if ((this.mget(_a.persistence) === _a.always) || ([_e.data, _a.idle].includes(origin != null ? origin.status : undefined))) {
      return;
    }
    const p = this.getHandlers(_a.ui)[0] || this;
    if ((e != null) && !p.el.contains(e.currentTarget)) {
      this.service = _e.cancel;
      if (this.mget(_a.persistence) == _a.always) return;
      if (this.searchboxRef) {
        this.searchboxRef._input.setValue('');
      }
      this.resultsContainer.el.hide();
    }
  };


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "roll-results":
        return this.resultsRoll = child;

      case "ref-actions-bar":
        this.actionsBar = child;
        return child.on(_e.show, () => child.el.dataset.active = 0);

      case "roll-selection":
        this.selectionRoll = child;
        var f = () => {
          this.triggerHandlers();
        };
        child.collection.on(_e.add, f);
        return child.collection.on(_e.remove, f);

      case "results-container":
        this.resultsContainer = child;
        this._onOutsideClick = (e, origin) => {
          if (pointerDragged) {
            return
          }
          if (!_.isEmpty(e) && !this.el.contains(e.currentTarget)) {
            this.resultsContainer.el.hide();
            this.actionsBar.el.dataset.active = 0;
          }
        }

        RADIO_CLICK.on(_e.click, this._onOutsideClick)
        return child.on(_e.show, () => child.el.hide());

      case "ref-searchbox":
        return this.searchboxRef = child;

      case "tooltips-wrapper":
        return this._tooltips = child;
    }
  }

  /**
   * 
   */
  getApi() {
    if (this.mget(_a.api)) {
      return this.mget(_a.api);
    }
    // contact.lookup also matches the typed string against every address in
    // the address book, so a half-typed email finds its contact; it degrades
    // to the legacy name-only search when the server lacks the route.
    const { lookupApi } = require('libs/contact-lookup');
    const a = lookupApi({ page: 1 });
    if (this.mget('only_drumate') || this.mget('only_drumate') == null) {
      a.only_drumate = 1;
    }
    return a;
  }

  /**
   * 
   */
  focus() {
    try {
      return this.searchboxRef.findPart('ref-entry').focus();
    } catch (error) { }
  }

  /**
   * 
   */
  getData() {
    return this.searchboxRef.getData(_a.email);
  }

  /**
   * 
   */
  getValue() {
    return this.searchboxRef.getValue();
  }

  /**
   * 
   * @param {*} src 
   */
  _addDrumate(src) {
    this.service = "add-item";
    this.source = src;
    this.resultsContainer.el.hide();
    this.actionsBar.el.dataset.active = 0;
    if (this.searchboxRef.source) {
      this.searchboxRef.source.setValue('');
    }
    return this.triggerHandlers({ item: src });
  }

  /**
   * 
   * @param {*} src 
   */
  _addGuest(src) {
    let email = this.searchboxRef.source.getValue('') || '';
    if (email.isEmail()) this.searchboxRef.source.setValue('');
    return this.triggerHandlers({
      service: 'add-guest',
      email,
    });
  }
  /**
   * 
   */
  getSelection() {
    const sel = [];
    this.resultsRoll.children.each(c => {
      if (c.mget(_a.state)) {
        return sel.push(c);
      }
    });
    return sel;
  }

  /**
   * 
   */
  pendingValue(clear = 0) {
    let r = this.searchboxRef.getValue();
    if (clear) this.searchboxRef.source.setValue('');
    return r;
  }

  /**
   * 
   */
  _addSelection() {
    this.selection = this.getSelection();
    if (_.isEmpty(this.selection)) {
      return;
    }
    this.source = this;
    this.triggerHandlers({ items: this.selection });
    this.resultsContainer.el.hide();
    this.actionsBar.el.dataset.active = 0;
    if (this.searchboxRef.source) {
      return this.searchboxRef.source.setValue('');
    }
  }

  /**
   * 
   * @returns 
   */
  checkSanity() {
    if (!this.searchboxRef) {
      return null;
    }
    let str = this.searchboxRef.getValue() || '';

    if (typeof str !== 'string' || !str.isEmail()) {
      return null;
    }
    str = str.replace(/ +/g, '');
    const re = new RegExp(`^${str}$`, 'i');
    const children = this.resultsRoll && this.resultsRoll.children ? this.resultsRoll.children.toArray() : [];
    for (let c of Array.from(children)) {
      const email = c.mget && c.mget(_a.email);
      const fullname = c.mget && c.mget(_a.fullname);
      if (email != null && re.test(String(email))) return c;
      if (fullname != null && typeof fullname === 'string' && re.test(fullname.replace(/ +/g, ''))) return c;
    }
    return str;
  }

  /**
   * 
   * @param {*} cmd 
   */
  _showResults(cmd, args = {}) {
    const raw = (args && args.results) != null ? args.results : (cmd && cmd.results);
    const data = Array.isArray(raw) ? raw : (raw && raw.data) || [];
    this.results = data;
    let sharees = this.getSharees()
    if (_.isEmpty(data)) {
      this.resultsContainer.el.hide();
      this.service = _e.update;
      this.triggerHandlers({ service: _e.update });
    } else {
      const items = data.map((r) => {
        const item = { ...r, ...this.contactItem };
        for (let s of Array.from(sharees)) {
          if (item.email === s.email) {
            item.state = 1;
            item.preselect = 1;
          }
        }
        if ((item.role == null)) {
          item.role = _a.found;
        }
        return item;
      });
      this.resultsContainer.el.show();
      this.resultsRoll.feed(items);
      this.service = _e.found;
      this.triggerHandlers({ service: _e.found });
    }
  }

  /**
   * @param {Letc} cmd
  */
  _showAll(cmd) {
    if (this.resultsContainer.el.dataset.state == _a.open) {
      this.resultsContainer.el.hide();
      // Performance : huge list take time to be removed
      setTimeout(() => {
        this.resultsRoll.clear()
        this.triggerHandlers({ service: "show-contacts-list", state: 0 })
      }, 1000);
      return;
    }
    const o = _.clone(this.contactItem);
    let api = '';
    o.root = this.mget(_a.uiHandler);
    if (this.mget('apiAll')) {
      api = this.mget('apiAll')
      if (api.page) { delete api.page }
    } else {
      // "%" = no filter: contact.lookup lists the whole address book (paged),
      // as my_contacts did.
      const { lookupApi } = require('libs/contact-lookup');
      api = lookupApi({ value: "%", only_drumate: 1 });
    }

    this.resultsRoll.model.set({
      api,
      itemsOpt: o
    });

    this.resultsRoll.restart();
    this.resultsContainer.el.show();
    this.triggerHandlers({ service: "show-contacts-list", state: 1 })

    return
  }

  /**
   * 
  */
  refreshIconState() {
    if (this.searchboxRef.getValue() && this.mget('addGuest')) {
      this.__ctrlShowAll.setState(1);
    } else {
      this.__ctrlShowAll.setState(0);
    }
  }

  /**
   * 
  */
  submitInput() {
    this.status = _a.commit;
    let email = this.searchboxRef.getValue() || '';
    if (this.mget('addGuest')) {
      if (email.trim() == '') {
        return true;
      }
      var item = this.checkSanity();
      if (!item) {
        this.status = _a.error;
        this.triggerHandlers({ error: this.status });
        this.searchboxRef._input.showError(LOCALE.ENTER_A_VALID_EMAIL)
        return false;
      }
      this._addGuest();
      return true;
    }
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);

    switch (service) {
      case "items-found":
        this._showResults(cmd, args);
        this.refreshIconState();
        return;

      case "show-all":
        this._showAll(cmd);
        this.refreshIconState();
        return;

      case _e.Enter: case "add-guest":
        this.refreshIconState();
        this.submitInput();
        break;


      case "add-item":
        this._addDrumate(cmd);
        break;

      case "add-selection":
        this.service = service;
        this._addSelection(cmd);
        return;

      case _e.select:
        this.selection = this.getSelection();
        if (_.isEmpty(this.selection)) {
          this.actionsBar.el.dataset.active = 0;
        } else {
          this.actionsBar.el.dataset.active = 1;
        }
        return;
    }
    if (this.searchboxRef.getValue() && this.mget('addGuest')) {
      this.__ctrlShowAll.setState(1);
      this.__ctrlShowAll.mset({ service: 'add-guest' });
    } else {
      this.__ctrlShowAll.setState(0);
      this.__ctrlShowAll.mset({ service: 'show-all' });
    }
  }
}

module.exports = __invitation_searchbox;
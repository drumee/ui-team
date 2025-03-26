// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : drumee/builtins/admin/locale
//   TYPE : 
// ==================================================================== *

require('./skin');
const { copyToClipboard } = require("core/utils")

class __admin_locale extends LetcBox {

  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.addOrUpdate = this.addOrUpdate.bind(this);
    this.addEntry = this.addEntry.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._acknowledge = this._acknowledge.bind(this);
    this._refreshRow = this._refreshRow.bind(this);
    this._removeRow = this._removeRow.bind(this);
    this._prependRow = this._prependRow.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    this._contextmenu = true;
    this._origin = {};
    this.hub_id = Visitor.id;
    this.model.set({ category: 'ui' });
    RADIO_KBD.on(_e.keyup, this.handleKbdEvent.bind(this));
  }

  /**
   * 
   */
  onDestroy() {
    RADIO_KBD.off(_e.keyup, this.handleKbdEvent.bind(this));
  }

  /**
   * 
   */
  handleKbdEvent(e) {
    switch (e.code) {
      case 'Escape':
        this.dialogWrapper.clear();
        break;

    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
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
      case "wrapper-dialog":
        return this.dialogWrapper = child;
      case _a.content:
        return this.content = child;
    }
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  async addOrUpdate(cmd) {
    const data = this.__entryForm.getData() || {};
    let r = this.__entryForm.getItemsByAttr(_a.type, _a.textarea);
    let key = this.__mainKeycode.getValue();
    let t = await this.postService(SERVICE.locale.get, { key }, { async: 1 });
    if (t && t.length) {
      this.__commitButton.set({
        content: LOCALE.UPDATE,
        service: 'update-entry'
      })
      this.__commitButton.el.dataset.effect = _a.slide;
      this.__confirmWrapper.feed(Skeletons.Note({
        className: `${this.fig.family}__confirm-message`,
        content: LOCALE.ALREADY_EXISTS.format(key),
      }))
      return;
    }
    this.addEntry();
  }

  // ===========================================================
  //
  // ===========================================================
  addEntry() {
    const values = this.__entryForm.getData() || {};
    this.postService(SERVICE.locale.add, {
      values,
      category: this.mget(_a.category)
    }).then((data) => {
      this.dialogWrapper.clear();
      if (!data || !data.length) return;
      let items = this.getItemsByAttr('key_code', data[0].key_code);
      let found = 0;
      for (var d of data) {
        for (var c of items) {
          if (c.mget(_a.name) != d.lng) continue;
          c.mset({
            name: d.lng,
            value: d.des,
          })
          found = 1;
          if (!_.isFunction(c.set)) continue;
          if (c.mget(_a.kind) == 'entry') {
            c.set(d.des);
          } else {
            c.set({ content: d.des });
          }
        }
      }
      if (!found) {
        let r = {};
        for (let d of data) {
          if (!r.key_code && d.key_code) {
            r.key_code = d.key_code;
          }
          r[d.lng] = d;
        }
        this.__content.scrollTo(0);
        this.__content.prepend({
          kind: 'locale_language',
          uiHandler: [this],
          ...r
        })
      }
    });
  }

  /**
   * 
   */
  async swicthLanguage(cmd) {
    if (!this.currentKey || this.currentKey.isDestroyed()) return;
    if (this.__formEntry.changed()) {
      let data = {
        value: this.__formEntry.getValue(1),
        id: this.__formEntry.mget(_a.id)
      }
      let r = await this.postService(SERVICE.locale.update, data, { async: 1 });
      let lang = r.current.lng;
      let lv = this.currentKey.mget(lang) || {};
      lv.des = r.current.des;
      this.currentKey.mset(lang, lv)
      this.updateViews(r);
    }
    let lname = cmd.mget(_a.name);
    let key_code = this.currentKey.mget('key_code');
    if (LOCALE[lname]) {
      lname = LOCALE[lname]
    }
    lname = `${lname} -- ${key_code}`
    this.__currentLang.set({ content: lname })
    let c = this.currentKey.mget(cmd.mget(_a.name)) || {};
    this.__formEntry.mset({
      name: cmd.mget(_a.name),
      id: c.id,
      value: c.des,
    })
    this.__formEntry.setValue(c.des);

  }

  // ===========================================================
  // onUiEvent
  //
  // @param [Object] cmd
  //
  // ===========================================================
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.model.get(_a.service);
    let item, opt;
    switch (service) {
      case _e.copy:
        return copyToClipboard(this.__formEntry.getValue());

      case "add-or-update":
        return this.addOrUpdate(cmd);

      case "lookup-key":
        this.lookupKey(cmd, args);
        break;

      case "fetch-entry":
        this.fetchEntry(cmd);
        break;

      case "search":
        if (!this.dialogWrapper.isEmpty()) {
          this.dialogWrapper.clear();
          return;
        }
        return this.dialogWrapper.feed(require('./skeleton/searchbox')(this));

      case "items-found":
        return this.content.feed(cmd.results);

      case "prompt-remove":
        this.dialogWrapper.feed(require('./skeleton/prompt-remove')(this, args));
        return;

      case "commit-remove":
        this.postService({
          service: SERVICE.locale.delete,
          key: cmd.mget(_a.key),
          category: this.mget(_a.category)
        }).then((data) => {
          this.dialogWrapper.clear();
          if (!data || !data.key_code) return;
          let items = this.getItemsByAttr('key_code', data.key_code);
          for (var c of items) {
            if (c.mget(_a.kind) == 'locale_language') {
              c.goodbye();
            }
          }
        })
        return;

      case "load-item":
        item = this._data[cmd.mget(_a.name)];
        if (!item) return;
        opt = {
          ...item,
          name: item.lng,
          value: item.des
        }
        return this.promptTranslate(opt);

      case "update-translation":
        this.currentKey = cmd;
        this.currentItem = args.trigger;
        return this.promptTranslate(args);

      case "change-type":
        this.mset({ category: cmd.mget(_a.category) })
        return this.__content.restart();

      // case "edit-row":
      //   return this.dialogWrapper.feed(require('./skeleton/entry-form')(this, cmd));

      case "commit-translation":
        let data = {
          value: this.__formEntry.getValue(),
          id: this.__formEntry.mget(_a.id)
        }
        if(!data.id){
          data.lang =  this.__formEntry.mget(_a.name);
          data.code =  this.__formEntry.mget(_a.code);
          data.category = this.mget(_a.category);
        }
        this.postService(SERVICE.locale.update, data, { async: 1 })
          .then((r) => {
            this.updateViews(r);
            if (lastClick.shiftKey || lastClick.altKey) {
              this.dialogWrapper.clear();
            }
          });
        return

      case "new-entry":
        return this.dialogWrapper.feed(require('./skeleton/entry-form')(this, cmd));

      case "update-entry":
        return this.addEntry();

      case "select-key":
        if (args.state) {
          this.currentKey = cmd;
        } else {
          this.currentKey = null;
        }
        break;

      case "select-lang":
        return this.swicthLanguage(cmd);

      case "copy-build-path":
        copyToClipboard(cmd.mget(_a.text));
        let el = this.__clipboadMessage.el;
        el.dataset.state = "1";
        setTimeout(() => { el.dataset.state = "0" }, 3000);
        return;

      case "build-lex":
        this.dialogWrapper.feed(
          require('./skeleton/acknowledge')(this, null, "Build in progress. It's take a while")
        );
        return this.postService({
          service: SERVICE.locale.build,
          upload: 1 // To set longer timeout
        }).then((data) => {
          this.dialogWrapper.feed(require('./skeleton/acknowledge')(this, data));
        }).catch((e) => {
          Butler.say(`Failed to build locale dictionnaryr.`);
          this.warn(e);
        })

      case _a.interactive:
        if (!this.__resultsWrapper) return;
        return this.__resultsWrapper.clear();

      case _e.close:
      case "close-popup":
        return this.dialogWrapper.clear();
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _acknowledge(data) {
    const f = () => {
      return this.dialogWrapper.clear();
    };
    return _.delay(f, 500);
  }

  /**
  * 
  */
  lookupKey(cmd, args) {
    if (args.__inputStatus == _a.cancel) {
      this.__resultsWrapper.clear();
      cmd.set('');
      return;
    }
    let key = cmd.getValue();
    if (!key || key.length < 2) return;
    this.fetchService({
      service: SERVICE.locale.keys,
      category: this.mget(_a.category),
      key
    }, { async: 1 }).then((data) => {
      let items = [];
      for (var e of data) {
        items.push({
          kind: KIND.note,
          content: e.content,
          className: `${this.fig.family}__results-item`,
          value: e.content,
          service: 'fetch-entry',
        })
      }
      this.__resultsWrapper.feed(items);
    });
  }

  /**
   * 
   * @param {*} opt 
   */
  fetchEntry(cmd) {
    let key = cmd.mget(_a.value);
    let category = this.mget(_a.category);
    this.postService(SERVICE.locale.get, { key, category }, { async: 1 })
      .then((data) => {
        if (!data) return;
        if (!_.isArray(data)) data = [data];
        for (var item of data) {
          let r = this.__entryForm.getItemsByAttr('field', `entry-${item.lng}`);
          if (r && r[0]) {
            r[0].mset(r[0]);
            r[0].set(item.value);
            this.__resultsWrapper.clear();
          }
        }
        this.__mainKeycode.set(data[0].key_code);
      })
  }
  /**
   * 
   */
  promptTranslate(opt) {
    this.dialogWrapper.feed(
      require('./skeleton/translate')(this, opt)
    );
  }

  /**
   * 
   * @returns 
   */
  listApi() {
    return {
      service: SERVICE.locale.list,
      page: 1,
      hub_id: Visitor.id,
      category: this.mget(_a.category)
    }
  }

  /**
   * 
   * @returns 
   */
  searchApi() {
    return {
      service: SERVICE.locale.search,
      page: 1,
      hub_id: Visitor.id,
      category: this.mget(_a.category)
    }
  }
  /**
   * 
   */
  updateViews(res) {
    this._data = res;
    if (res.previous) {
      this.__previousItem.el.dataset.state = "1";
    } else {
      this.__previousItem.el.dataset.state = "0";
    }
    if (res.next) {
      this.__nextItem.el.dataset.state = "1";
    } else {
      this.__nextItem.el.dataset.state = "0";
    }
    if (res.current) {
      let items = this.getItemsByAttr('id', res.current.id);
      if(!items || !items.length){
        if(this.currentItem){
          items = [this.currentItem];
        }
      } 
      for (var c of items) {
        c.mset({
          id: res.current.id,
          name: res.current.lng,
          value: res.current.des,
          content: res.current.des
        })
        if (c.mget(_a.kind) == 'entry') {
          c.set(res.current.des);
        } else {
          c.set({ content: res.current.des });
        }
      }
    }
  }

  // ===========================================================
  // _refreshRow
  //
  // @param [Object] cmd
  //
  // @return [Object] 
  //
  // ===========================================================
  _refreshRow(data) {
    //@debug "GGGGGGGGGGGG", data
    this._acknowledge();
    const list = this.getPart(_a.content);
    return list.children.each(function (c) {
      if (c.children.first().model.get(_a.value) === data.key_code) {
        return c.children.each(function (k) {
          const name = k.model.get(_a.name);
          if (name && _.isFunction(k.reload)) {
            k.model.set({
              content: data[name],
              value: data[name]
            });
            return k.reload();
          }
        });
      }
    });
  }

  // ===========================================================
  // _removeRow
  //
  // @param [Object] cmd
  //
  // @return [Object] 
  //
  // ===========================================================
  _removeRow(data) {
    this._acknowledge();
    //list = @getPart(_a.list)
    const list = this.getPart(_a.content);
    return list.children.each(function (c) {
      if (c.children.first().model.get(_a.value) === data.key_code) {
        return list.collection.remove(c.model);
      }
    });
  }

  // ===========================================================
  // _prependRow
  //
  // @param [Object] cmd
  //
  // @return [Object] 
  //
  // ===========================================================
  _prependRow(data) {
    this._acknowledge();
    const list = this.getPart(_a.content);
    return list.prepend(require('./skeleton/row-view')(this, data));
  }


}

module.exports = __admin_locale;
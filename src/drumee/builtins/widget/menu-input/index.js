const emojiFlags = require('emoji-flags');

class __menu_input extends LetcBox {

  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.model.atLeast({
      axis: _a.y
    })
    this.kbdHandler = this.kbdHandler.bind(this);
    this.clickHandler = this.clickHandler.bind(this);
    this.showMenu = this.showMenu.bind(this);
    this.populateItems = this.populateItems.bind(this);
    let items = []
    for (let k of _.keys(emojiFlags)) {
      if (/[A-Z]{2,2}/.test(k)) {
        let { name: locale_name, emoji } = emojiFlags.countryCode(k) || {}
        items.push({ country_code: k, emoji, locale_name })
      }
    }
    this.mset({ items })
    // this.debug("AAA:19", items, this.mget('items'), emojiFlags)
  }

  /**
   * 
   */
  onDestroy() {
    RADIO_KBD.off(_e.keyup, this.kbdHandler)
    RADIO_BROADCAST.off(_e.click, this.clickHandler)
    RADIO_CLICK.off(_e.keyup, this.clickHandler)
  }

  /**
   * 
   * @param {*} key 
   */
  kbdHandler(key) {
    if (key == _e.Escape) {
      this.clearItems();
    }
  }

  /**
   * 
   * @param {*} key 
   */
  clickHandler(e, origin) {
    if (pointerDragged) {
      return;
    }
    if (e && this.el.contains(e.currentTarget)) {
      return;
    }
    if (origin && (this.contains(origin) || ([_e.data, _a.idle].includes(origin.status)))) {
      return;
    }
    this.clearItems();
  }

  /**
   * 
   */
  clearItems() {
    this.ensurePart('items').then((p) => { p.clear() })
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    RADIO_KBD.on(_e.keyup, this.kbdHandler)
    RADIO_CLICK.on(_e.keyup, this.clickHandler)
    RADIO_BROADCAST.on(_e.click, this.clickHandler)
  }

  /**
   * Show the menu
   * @param {*} cmd
   */
  showMenu(cmd) {
    let r = []
    this.ensurePart("shower").then((p) => {
      p.setState(0)
    })
    this.ensurePart('items').then((p) => {
      if (!p.isEmpty()) {
        p.clear()
        return
      }
      let items = this.mget(_a.items);
      for (let item of items) {
        r.push(this.getItem(item));
      }
      p.feed(r)
    })
  }


  /**
   * User Interaction Evant Handler
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = cmd.mget(_a.service);
    // this.debug("AAA:45", service, cmd, args);
    let name = this.mget(_a.name);
    switch (service) {
      case "item-selected":
        this.selectItem(cmd);
        break;
      case "show-menu":
        this.showMenu(cmd);
        break;
      case _e.reset:
        this.clearItems();
        this.setValue('');
        break;
      case _a.input:
        switch (cmd.mget(_a.name)) {
          case name:
            let { key } = args;
            if (!key) {
              this.populateItems(cmd);
            } else {
              this.selectItem(cmd, key);
            }
            break;
        }
        break;
    }
  }

  /**
   * 
   */
  getItem(item) {
    let refAttribute = this.mget('refAttribute');
    let ref = item[refAttribute]
    return Skeletons.Note({
      ...item,
      className: `${this.fig.family}__item`,
      content: `<span class="flag">${item.emoji}</span><span class="name">${ref}</span>`,
      service: "item-selected",
      uiHandler: [this],
      state: 0
    })

  }


  /**
   * 
   */
  populateItems(cmd) {
    let r = []
    if (!cmd || !cmd.getValue) return r;
    let val = cmd.getValue() || '.*';
    let reg = new RegExp(val, 'i')
    let refAttribute = this.mget('refAttribute');
    this._selIndex = 0;
    this.ensurePart("shower").then((p) => {
      p.setState(0)
    })
    for (let item of this.mget(_a.items)) {
      let ref = item[refAttribute]
      if (reg.test(ref) || reg.test(item.label)) {
        r.push(this.getItem(item));
      }
    }
    this.ensurePart('items').then((p) => {
      p.feed(r)
    })
    return r;
  }

  /**
   * 
   */
  getData() {
    let r = {
      name: this.mget(_a.name),
      value: this.mget(_a.value),
    }
    r[this.mget(_a.name)] = this.mget(_a.value)
    return r
  }
  /**
   * 
   */
  commitSelection(cmd) {
    this.debug("AAA:181", cmd)
    this.ensurePart("shower").then((p) => {
      let content = cmd.mget(_a.content)
      p.set({ content })
      p.setState(1)
    })
    this.ensurePart("entry").then((p) => {
      p.setValue("");
      this.clearItems();
    })
    this.ensurePart("carret").then((p) => {
      p.setState(1);
    })
    this.mset({ value: cmd.mget('country_code') })
    this.triggerHandlers({ source: cmd })
  }

  /**
  * 
  * @param {*} v 
  */
  setValue(v) {
    this.ensurePart(_a.entry).then((p) => { p.setValue(v) })
  }

  /**
  * 
  */
  async selectItem(cmd, key) {
    if (!key) {
      return this.commitSelection(cmd)
    }
    let content = await this.ensurePart('items');
    if (key == _e.Escape) {
      content.clear();
      return;
    }
    let curSel = this._curSelection;
    if (key == _e.Enter && curSel) {
      return this.commitSelection(curSel)
    }
    let i = 0;
    if (/down/i.test(key)) {
      if (content.isEmpty()) {
        let input = await this.ensurePart("entry");
        this.populateItems(input);
        return;
      }
    }
    for (let c of content.children.toArray()) {
      if (this._selIndex == i) {
        c.el.dataset.state = "1";
        this._curSelection = c;
        curSel = c;
      } else {
        c.el.dataset.state = "0";
      }
      i++;
    }
    if (!curSel) return;
    if (/up/i.test(key)) {
      this._selIndex--;
    } else if (/down/i.test(key)) {
      this._selIndex++;
    } else {
      return
    }

    if (this._selIndex >= content.collection.length) {
      this._selIndex = 0;
    }
    if (this._selIndex < 0) {
      this._selIndex = content.collection.length - 1;
    }

    let delta = curSel.$el.position().top + curSel.$el.height() - content.el.innerHeight();
    if (delta) {
      content.el.scrollBy(0, delta);
    }
  }


}

module.exports = __menu_input
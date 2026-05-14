
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

    // If items are provided in opt, use them; otherwise use emojiFlags (country code default)
    let items = this.mget(_a.items) || [];
    if (!items || items.length === 0) {
      const emojiFlags = require('emoji-flags');
      // Default: populate items from emojiFlags for country code
      items = []
      for (let k of _.keys(emojiFlags)) {
        if (/[A-Z]{2,2}/.test(k)) {
          let { name: locale_name, emoji } = emojiFlags.countryCode(k) || {}
          items.push({ country_code: k, emoji, locale_name })
        }
      }
    }
    this.mset({ items })
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

    // Check if click is inside the widget or items dropdown
    if (e && e.target) {
      const target = e.target;
      // Check if click is inside main widget element
      if (this.el && this.el.contains(target)) {
        return;
      }

      // Check if click is inside items dropdown wrapper (positioned absolutely)
      this.ensurePart('items').then((itemsPart) => {
        if (itemsPart && !itemsPart.isEmpty()) {
          // Get the items wrapper element
          const itemsWrapper = this.el.querySelector('.menu-input__items-wrapper');
          if (itemsWrapper && itemsWrapper.contains(target)) {
            return; // Click is inside items dropdown, don't close
          }
        }
        // Click is outside both widget and dropdown, close it
        this.clearItems();
      });
      return;
    }

    if (origin && (this.contains(origin) || ([_e.data, _a.idle].includes(origin.status)))) {
      return;
    }

    // Close dropdown if click is outside
    this.clearItems();
  }

  /**
   * 
   */
  clearItems() {
    this.ensurePart('items').then((p) => {
      p.clear();
      // Reset icon to carret-down when menu closes
      this.ensurePart("carret").then((carretPart) => {
        carretPart.setState(0);
      });
    })
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
    // Clear input field to allow user to search from scratch
    this.ensurePart("entry").then((p) => {
      p.setValue("");
    })
    this.ensurePart("shower").then((p) => {
      p.setState(0)
    })
    this.ensurePart('items').then((p) => {
      if (!p.isEmpty()) {
        // Menu is already open, close it
        p.clear()
        // Reset icon to carret-down when closing
        this.ensurePart("carret").then((carretPart) => {
          carretPart.setState(0);
        });
        return
      }
      // Show all items when menu opens
      let items = this.mget(_a.items);
      for (let item of items) {
        r.push(this.getItem(item));
      }
      p.feed(r)
      // Toggle icon to carret-up when menu opens
      this.ensurePart("carret").then((carretPart) => {
        carretPart.setState(1);
      });
    })
  }


  /**
   * User Interaction Evant Handler
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = cmd.mget(_a.service);
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
    let refLabel = this.mget('refLabel');
    let ref = item.label || item[refLabel] || item.value || '';

    // If item has emoji (country code case), use flag format
    let content;
    if (item.emoji) {
      content = `<span class="flag">${item.emoji}</span><span class="name">${ref}</span>`;
    } else {
      // For other items (timezone, date format, etc.), use simple text
      content = ref;
    }

    return Skeletons.Note({
      ...item,
      className: `${this.fig.family}__item`,
      content: content,
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

    let val = cmd.getValue() || '';

    // Check if items list is empty (menu just opened)
    this.ensurePart('items').then((itemsPart) => {
      const isMenuJustOpened = itemsPart.isEmpty();

      // If menu just opened and input has value (from previous selection), clear it and show all
      if (isMenuJustOpened && val && val !== '.*') {
        // Clear input to allow fresh search - do it first
        this.ensurePart("entry").then((entryPart) => {
          entryPart.setValue("");
        });
        // Use empty pattern to show all items when menu just opened
        val = '.*';
      }

      let reg = new RegExp(val, 'i')
      let refLabel = this.mget('refLabel');
      this._selIndex = 0;
      this.ensurePart("shower").then((p) => {
        p.setState(0)
      })

      for (let item of this.mget(_a.items)) {
        let ref = item[refLabel] || item.label || '';
        // Search by refLabel/label, value, or label
        if (reg.test(ref) || reg.test(item.label || '') || reg.test(item.value || '')) {
          r.push(this.getItem(item));
        }
      }

      itemsPart.feed(r);
    });

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
    // Get value from item - support refLabel, value, country_code (for country), and name
    let refLabel = this.mget('refLabel');
    let value = cmd.mget(refLabel) || cmd.mget('value') || cmd.mget('country_code') || cmd.mget(_a.name);

    // If cmd is null or value is empty, try to get from input field (direct input)
    if (!cmd || !value || value === "") {
      return this.ensurePart("entry").then((entryPart) => {
        if (entryPart && entryPart._input) {
          const inputValue = entryPart._input.value.trim();
          if (inputValue && inputValue !== "") {
            // Validate it's a valid number (can be negative)
            const numValue = parseInt(inputValue);
            if (!isNaN(numValue)) {
              value = inputValue;
              // Format display content
              let displayContent = value;
              if (value === "0") {
                displayContent = LOCALE.NEVER || "Never";
              } else if (numValue === 60) {
                displayContent = "1 hour";
              } else if (numValue === 120) {
                displayContent = "2 hours";
              } else {
                displayContent = `${value} minutes`;
              }

              // Update shower with formatted display
              this.ensurePart("shower").then((p) => {
                p.set({ content: displayContent });
                p.setState(1);
              });
              this.ensurePart("entry").then((p) => {
                p.setValue("");
                this.clearItems();
              });
              this.mset({ value });
              this.triggerHandlers({ source: entryPart });
              return;
            }
          }
        }
        // If invalid or empty, use default
        value = "0";
        this.ensurePart("shower").then((p) => {
          p.set({ content: LOCALE.NEVER || "Never" });
          p.setState(1);
        });
        this.ensurePart("entry").then((p) => {
          p.setValue("");
          this.clearItems();
        });
        this.mset({ value });
        this.triggerHandlers({ source: cmd || this });
      });
    }

    // For normal item selection, use standard flow
    this.ensurePart("shower").then((p) => {
      let content = cmd.mget(_a.content) || cmd.mget(_a.value)
      p.set({ content })
      p.setState(1)
    })
    this.ensurePart("entry").then((p) => {
      p.setValue("");
      this.clearItems();
    })
    // Icon will be reset to carret-down (state 0) in clearItems()
    this.mset({ value })
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
    if (key == _e.Enter) {
      // If Enter is pressed and there's a selected item, commit it
      if (curSel) {
        return this.commitSelection(curSel)
      }
      // If Enter is pressed but no item is selected, commit direct input value
      return this.commitSelection(null)
    }
    let i = 0;
    if (/down/i.test(key)) {
      if (content.isEmpty()) {
        // Clear input and show all items when opening menu with arrow down
        let input = await this.ensurePart("entry");
        input.setValue(""); // Clear input to show all items
        // Show all items instead of filtering
        let r = []
        let items = this.mget(_a.items);
        for (let item of items) {
          r.push(this.getItem(item));
        }
        content.feed(r);
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

class __desk_dock extends LetcBox {

  constructor(...args) {
    super(...args);
    this.moveForbiden = this.moveForbiden.bind(this);
    this.moveAllowed = this.moveAllowed.bind(this);
    this.mediaDropOnBin = this.mediaDropOnBin.bind(this);
    this.mediaDragOverBin = this.mediaDragOverBin.bind(this);
    this.mediaDragLeaveBin = this.mediaDragLeaveBin.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    this.fig = 1;
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._launchOptions = { explicit: 1, singleton: 1 };
    this.contextmenuSkeleton = _a.none;
  }


  /**
   * 
   * @param {*} kind 
   * @param {*} args 
   */
  _createHub(kind, args) {
    const aw = Wm.getActiveWindow();
    if (aw.isHub) {
      aw.warning(LOCALE.NOT_POSSIBLE_NESTING_HUBS);
      return;
    }
    if (this.phase === _a.creating) {
      return;
    }

    Wm.launch({
      kind,
      nid: aw.getCurrentNid(),
      service: "new-hub",
      uiHandler: aw
    }, {
      explicit: 1, singleton: 1
    });
  }


  /**
   * 
   */
  onChildBubble() {

  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  mediaDragOverBin(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    const m = ui.helper.moving;
    if ((m == null)) {
      return;
    }
    m.isHoveringBin = true;
    if (m.containsHub) {
      this.moveForbiden(LOCALE.USE_MANAGER_TO_DELETE);
      ui.helper.moving.valid = false;
      return;
    }

    if (m.mget(_a.status) === _a.locked) {
      ui.helper.moving.valid = false;
      this.moveForbiden();
      return;
    }

    if (!m.isGranted(_K.permission.delete)) {
      ui.helper.moving.valid = false;
      this.moveForbiden(LOCALE.WEAK_PRIVILEGE);
      return;
    }

    ui.helper.moving.valid = true;
    m.moveAllowed();
    this.__trashBin.el.dataset.over = _a.yes;
  }


  /**
   * 
   * @param {*} reason 
   * @returns 
   */
  moveForbiden(reason) {
    const d = document.getElementById(this._id + '-forbiden');
    if (d != null) {
      return;
    }
    const m = reason || LOCALE.FILE_NOT_DISPOSABLE;
    this.__trashBin.$el.prepend(require('builtins/media/template/forbiden')(this, m));
  }

  /**
   * 
   * @returns 
   */
  moveAllowed() {
    const d = document.getElementById(this._id + '-forbiden');
    if (Visitor.parseModuleArgs().timeout) {
      return;
    }
    if (d != null) {
      return d.remove();
    }
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  mediaDropOnBin(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.target.dataset.over = _a.no;
    const { moving } = ui.helper;
    if ((moving == null)) {
      return;
    }
    moving.isHoveringBin = true;
    if (!moving.valid) {
      this.moveAllowed();
      moving.valid = true;
      return;
    }
    const selected = Wm.getGlobalSelection();
    if (moving.mget(_a.filetype) === _a.hub) {
      return;
    }
    if (!_.isEmpty(selected)) {
      this.putIntoTrash(selected);
      return;
    }
    moving.putIntoTrash();
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  mediaDragLeaveBin(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.__trashBin.el.dataset.over = _a.no;
    const { moving } = ui.helper;
    this.moveAllowed();
    if ((moving == null)) {
      return;
    }
    moving.isHoveringBin = false;
    return moving.valid = true;
  }



  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "trash-bin":
        child.on(_e.show, () => {
          child.$el.droppable({
            tolerance: "touch",
            over: this.mediaDragOverBin,
            out: this.mediaDragLeaveBin,
            drop: this.mediaDropOnBin,
            greedy: true
          });
        });
      case 'dock-container':
        this.waitElement(child.el, () => {
          child.$el.mouseover(() => {
            child.parent.$el.css("z-index", "100000");
          });
          child.$el.mouseout(() => {
            child.parent.$el.css("z-index", "10000");
          });
        })
    }
  }


  /**
 * 
 * @param {*} list  -- List of nodes 
 */
  putIntoTrash(list) {
    let nodes = [];
    if (list.length == 1) {
      list[0].delete(1, this.__trashBin.$el);
      return
    }
    for (var n of list) {
      if (n.mget(_a.filetype) == _a.hub) {
        n.unselect();
        n.moveForbiden(LOCALE.ACTION_NOT_PERMITTED);
        continue;
      }
      nodes.push({
        nid: n.mget(_a.nodeId),
        hub_id: n.mget(_a.hub_id),
        parent_id: n.mget(_a.parent_id),
      })
    }
    if (_.isEmpty(nodes)) return;
    this.postService({
      service: SERVICE.media.trash,
      nodes,
      hub_id: nodes[0].hub_id
    }).then((data) => {
      // if (!_.isArray(data)) data = [data];
      // for (var i of data) {
      //   if (!i) continue;
      //   let items = Wm.selectItems(i, _a.nid)
      //   for (let item of items) {
      //     item.delete(0, this.__trashBin.$el);
      //   }
      // }
    }).catch(e => {
      this.warn("Failed to delete nodes", nodes, e)
    })
  }

  /**
   * 
   * @param {*} cmd 
   */
  trash(cmd) {
    if (Wm.getGlobalSelection().length) {
      this.triggerHandlers({
        service: "remove-selection"
      });
    } else {
      const old = Wm.getItemByKind('pannel_trash');
      if ((old != null) && !old.isDestroyed()) {
        old.goodbye();
        return;
      }
      const item = {
        kind: 'pannel_trash',
        service: "open-node",
        trigger: cmd,
        uiHandler: [this]
      };
      Wm.windowsLayer.append(item)
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    Kind.waitFor('window_launcher').then(() => {
      this.feed(require('./skeleton')(this));
    })
  }

  /**
   * Open file picker and upload files to media window
   * Handles similarly to drag-drop file onto windows
   * Creates new media window if it doesn't exist
   */
  handleMediaUpload() {
    return Wm.launch({
      kind: 'window_media',
      maiden: 1
    });
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    let aw;
    switch (service) {
      case 'add-website':
      case 'add-team':
      case 'add-sharebox':
        aw = Wm.getActiveWindow();
        if (aw.isHub) {
          aw.warning(LOCALE.NOT_POSSIBLE_NESTING_HUBS);
          return;
        }
      case 'add-folder':
        return Wm.addFolder({ position: 0, area: cmd.mget(_a.area), filename: cmd.mget(_a.filename) });

      case 'add-media':
        return this.handleMediaUpload();

      case "toggle-chat":
        if (window.Desk && _.isFunction(window.Desk.togglePanel)) {
          return window.Desk.togglePanel("chat_p2p", "chat-panel");
        }
        return;

      case "open-searchbox":
        let state = this.__searchbox.get(_a.state) ^ 1;
        this.__searchbox.setState(state)
        return

      case "search-files":
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
          Wm.search(cmd, args);
          this._timer = null;
          let t = setInterval(() => {
            let w = Wm.getItemByKind('window_search');
            if (w) {
              w.once(_e.destroy, () => {
                this.__searchbox.setState(0)
                this.__searchboxInput.setValue('')
              })
              clearInterval(t)
            }
          }, 500)
        }, 1000);
        return;

      case 'add-note':
        if (require("libs/over-limit").guardWrite("write")) return;
        let e = Wm.windowsLayer.append({
          kind: 'editor_markdown',
          uiHandler: [this]
        });
        return e;

        case 'new-document':
        if (require("libs/over-limit").guardWrite("write")) return;
        return Wm.getActiveWindow().newDocument(cmd);

      case 'address-book':
        const route = cmd.mget(_a.route);
        this.__addressbookLauncher.el.dataset.isActive = _a.on
        Wm.launch({
          kind: 'window_addressbook',
          args: route,
          source: this.__addressbookLauncher
        }, this._launchOptions);
        return

      case 'contact-card':
      case 'calendar':
        return Wm.openContent(cmd);

      case "showInvite-notifications":
        return Wm.openContent(cmd);


      case _e.trash:
        return this.trash(cmd);

      case `video-help`:
        Wm.playTutorial(cmd.mget(_a.name));
        return;

      case _e.launch:
        if (cmd.mget('exclude')) {
          let e = Wm.getItemByKind(cmd.mget('exclude'));
          if (e && !e.isDestroyed()) {
            e.raise();
            return;
          }
        }
        if (Wm.mget('wicket_id') == null) {
          Wm.postService(SERVICE.desk.create_wicket).then((data) => {
            Wm.mset({ wicket_id: data.wicket_id })
            Wm.launch({ kind: cmd.mget(_a.respawn), source: cmd }, this._launchOptions);
          })
          return
        }
        cmd.el.dataset.isActive = _a.on;
        return Wm.launch({ kind: cmd.mget(_a.respawn), source: cmd }, this._launchOptions);
    }
  }
}

module.exports = __desk_dock

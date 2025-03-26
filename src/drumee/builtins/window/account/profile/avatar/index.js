
class __account_avatar extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._upload = this._upload.bind(this);
    this._uploadEnd = this._uploadEnd.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    require('./skin');
    return this.declareHandlers();
  }

  /**
   * 
   * @returns 
   */
  onBeforeDestroy() {
    if ((this._filter != null) && _.isFunction(this._filter.goodbye)) {
      return this._filter.goodbye();
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.feed(require('./skeleton')(this));
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
      case 'ref-avatar':
        this._avatar = child;

        Visitor.on(_e.change, m => {
          if (m.changed && m.changed.mtime) {
            return child.reload();
          }
        });

        return child.on(_e.uploaded, () => {
          return this.render();
        });
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    let data;
    if (args == null) { args = {}; }
    const service = args.service || cmd.service || cmd.mget(_a.service);
    this.debug(`onUiEvent profile service = ${service}`, args, cmd, this);
    switch (service) {
      case _e.change:
        return this._avatar.selectFile();

      case 'select-from-drive':
        var opt = {
          kind: 'window_filter',
          uiHandler: [this],
          anchor: cmd,
          showAll:1,
          itemsOpt: {
            kind: 'media_grid',
            service: 'change-avatar',
            uiHandler: [this]
          }
        };

        var c = Wm.launch(opt, { explicit: 1, singleton: 1 });
        if ((c != null ? c.isLazyClass : undefined)) {
          return Kind.waitFor('window_filter').then(z => {
            return this._filter = Wm.windowsLayer.children.last();
          });
        } else {
          return this._filter = c;
        }

      case 'change-avatar': case _e.select:
        data = {
          service: SERVICE.drumate.set_avatar,
          reference: cmd.mget(_a.nid),
          hub_id: Visitor.id
        };
        this.postService(data).then(() => {
          this._avatar.reload(1);
          this.render();
          cmd.wait(0);
        })
        return;

      case 'delete-avatar':
        data = {
          service: SERVICE.drumate.remove_avatar,
          hub_id: Visitor.id
        };
        return this.postService(data);
    }
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _upload(e) {
    let files;
    e.preventDefault();
    try {
      ({
        files
      } = e.originalEvent.dataTransfer);
    } catch (error) {
      ({
        files
      } = e.target);
    }
    return this._avatar.send(files, this._uploadEnd, "new");
  }

  /**
   * 
   * @param {*} avatar 
   * @param {*} data 
   * @returns 
   */
  _uploadEnd(avatar, data) {
    this.mget(_a.trigger).reload();
    return this._avatar.reload();
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
      case SERVICE.util.get_countries:
        return this.debug("data", data);

      case SERVICE.drumate.update_profile:
        Visitor.set(data);
        this._updateAck();

        var f = () => {
          return this._resetForm();
        };
        return _.delay(f, Visitor.timeout(1000));

      case SERVICE.drumate.remove_avatar:
        this._avatar.reload(1);
        return this.render();
    }
  }
}

module.exports = __account_avatar;

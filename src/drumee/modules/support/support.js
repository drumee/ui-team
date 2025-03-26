
const loader = require('utils/stylesheet');

define('support/ui', ["application"], function(app, marionetteClass) {
  class __feedback_ui extends LetcBox {
    constructor(...args) {
      this._registerClasses = this._registerClasses.bind(this);
      this.onDomRefresh = this.onDomRefresh.bind(this);
      this.onPartReady = this.onPartReady.bind(this);
      this._updateLocaleRow = this._updateLocaleRow.bind(this);
      this._addLocaleRow = this._addLocaleRow.bind(this);
      this.onUiEvent = this.onUiEvent.bind(this);
      this.route = this.route.bind(this);
      this._acknowledge = this._acknowledge.bind(this);
      this._refreshRow = this._refreshRow.bind(this);
      this._removeRow = this._removeRow.bind(this);
      this.__dispatchRest = this.__dispatchRest.bind(this);
      this._openMenu = this._openMenu.bind(this);
      super(...args);
    }

    static initClass() {
      this.prototype.templateName = _T.wrapper.raw;
      this.prototype.className  = "support-ui";
      this.prototype.events  =
        {click : '_select'};
    }

// >>===========================================================
// initialize
//
// @param [Object] opt
//
// >>===========================================================
    initialize(opt) {
      super.initialize(opt);
      this._contextmenu = true;
      this._origin = {};
      this.model.set({
        device  : _a.desktop,
        lang    : Visitor.language(),
        flow    : _a.vertical
      });
      RADIO_BROADCAST.on(_e.document.click, this._select);
      this._page = {};
      this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
      const stylesheet = new loader();
      stylesheet.load("support-main");
      // require('builtins/welcome/skin/welcome-main')
      this._registerClasses();

      return window.support = this;
    }


// >>=========================================================
// _registerClasses
//
//
// >>=========================================================
    _registerClasses() {
      // In case of too early call, check before usage
      //@debug "57 IIIIIIIIIIIII0 route section="
      this.lazyLoader = {};

      this._count = _.after(2, this.route); 

      Kind.register('feedback', require('./feedback/feedback'));
      Kind.register('feedback_item', require('./feedback/item/item'));
      return this._count();
    }

// >>===========================================================
// onDomRefresh
//
// >>===========================================================
    onDomRefresh() {
      //Butler.sleep()
      this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
      return this._count();
    }

// >>===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// >>===========================================================
    onPartReady(child, pn, section) {
      _dbg(">> BO W2233 CHILD READY WIDGET", pn, child, this);
      switch (pn) {
        case _a.menu:
          return this._menu = child;
        case "support-menu":
          return this._content = child;
        case "support-header":
          return this._header = child;
      }
    }

// >>===========================================================
// _updateLocaleRow
//
// @param [Object] view
//
// >>===========================================================
    _updateLocaleRow(cmd) {
      const data = cmd._buildData();
      data.service = SERVICE.yp.update_locale;
      return this.postService(data);
    }

// >>===========================================================
// _addLocaleRow
//
// @param [Object] view
//
// >>===========================================================
    _addLocaleRow(cmd) {
      const data = cmd._buildData() || {};
      data.key_code = data.key_code.toUpperCase();
      data.service = SERVICE.yp.add_locale;
      return this.postService(data);
    }

// >>===========================================================
// onUiEvent
//
// @param [Object] cmd
//
// >>===========================================================
    onUiEvent(cmd){
      let service = cmd.model.get(_a.service);
      if (cmd.status === _e.submit) {
        service = cmd.model.get(_a.service) || cmd.status;
      } else if (cmd.source != null) {
        service = cmd.source.model.get(_a.service);
      } else {
        service = cmd.model.get(_a.service);
      }

      return this.debug(`onUiEvent service=${service}`, cmd, cmd.get(_a.status));
    }
      // switch service
      //   when "update-locale-row"
      //     if cmd.status is _e.submit 
      //       @_updateLocaleRow(cmd)

      //   when "add-locale-row"
      //     if cmd.status is _e.submit 
      //       @_addLocaleRow(cmd)

      //   when "lookup-key"
      //     @fetchService
      //       service : SERVICE.yp.get_locale
      //       name    : cmd.source.model.get(_a.value)
            
      //   when "delete-key" 
      //     name = cmd.model.get(_a.name)
      //     @getPart('popup').feed require('./skeleton/locale/confirm-remove')(@, name)

      //   when "confirm-remove" 
      //     @fetchService
      //       service : SERVICE.yp.delete_locale
      //       name    : cmd.model.get(_a.value)
            
      //   when "show-more"
      //     list = @getPart(_a.list)
      //     list.fetch()

      //   when "show-all"
      //     list = @getPart(_a.list)
      //     list.tick(1000)

      //   when "edit-row"
      //     @getPart('popup').feed require('./skeleton/locale/row-form')(@, cmd)

      //   when "new-entry"
      //     @getPart('popup').feed require('./skeleton/locale/row-form')(@, cmd)

      //   when "build-lex"
      //     @fetchService
      //       service : SERVICE.yp.build_lexicon

      //   when "open-user-panel"
      //     @getPart('popup').feed require('./skeleton/user/add')(@)

      //   when "create-user"
      //     data = cmd._buildData()
      //     if not data? and cmd.status is _a.error
      //       @warn "Invalid data"
      //       return

      //     @debug "SDSDSDSD", data
      //     data.service = SERVICE.desk.create_account
      //     data.hub_id  = Visitor.get(_a.id)
      //     @postService data 
          
      //   when "show-password"
      //     @debug 'fdfdfyuyuuyu hjhhj ', cmd
      //     pw = cmd.getDescendent(_a.password)
      //     if pw?
      //       if cmd.source.model.get(_a.state)
      //         pw.model.set(_a.type, _a.text)
      //       else 
      //         pw.model.set(_a.type, _a.password)
      //       pw.reload()

      //   when _e.close, "close-popup"
      //     @getPart('popup').clear()

// >>===========================================================
// route
//
// @param [Object] opt=[]
//
// >>===========================================================
    route(opt) {
      if (opt == null) { opt = []; }
const urlSeparator = new RegExp(/[\/&\?]/g);
      opt = location.hash.split(urlSeparator);
      opt.shift();
      const section = opt[0];
      const tab = opt[1];
      this.debug(`route section=${section}, tab=${tab}`, opt);
      switch (tab) {
        case "feedback":
          return this.feed({kind: 'feedback'}); //@feed require('./skeleton/user/add')(@)

        default:
          this.warn("ROUTE UNDEFINED");
          return this.feed({kind: 'feedback'}); //@feed require('./skeleton/user/add')(@)
      }
    }

// >>===========================================================
// _acknowledge
//
// @param [Object] cmd
//
// @return [Object] 
//
// >>===========================================================
    _acknowledge(data) {
      this.getPart("popup").feed(SKL_Note(null, "Success"));
      const f = ()=> {
        return this.getPart('popup').clear();
      };
      return _.delay(f, Visitor.timeout());
    }

// >>===========================================================
// _refreshRow
//
// @param [Object] cmd
//
// @return [Object] 
//
// >>===========================================================
    _refreshRow(data) {
      this._acknowledge();
      const list = this.getPart(_a.list);
      return list.children.each(function(c){
        if (c.children.first().model.get(_a.value) === data.key_code) {
          return c.children.each(function(k){
            const name = k.model.get(_a.name);
            if (_.isFunction(k.reload)) {
              k.model.set({ 
                content : data[name],
                value : data[name]});
              return k.reload();
            }
          });
        }
      });
    }

// >>===========================================================
// _removeRow
//
// @param [Object] cmd
//
// @return [Object] 
//
// >>===========================================================
    _removeRow(data) {
      this._acknowledge();
      const list = this.getPart(_a.list);
      return list.children.each(function(c){
        if (c.children.first().model.get(_a.value) === data.key_code) {
          return list.collection.remove(c.model);
        }
      });
    }


   
// >>===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
//
// >>===========================================================
    __dispatchRest(method, data) {
      this.debug(">>TTT BACK 0", method, data);
      switch (method) {
        case SERVICE.yp.update_locale:
          return this._refreshRow(data);

        case SERVICE.yp.add_locale:
          return this._prependRow(data);

        case SERVICE.yp.delete_locale:
          return this._removeRow(data[0]);


        // when SERVICE.desk.create_account
        //   @feed require('./skeleton/user/confirm-create')(@, "CRETAED")

        default:
          return this.warn(WARNING.method.unprocessed.format(method), data);
      }
    }
// ======================================================
//
// ======================================================

// >>===========================================================
// _openMenu
//
// @param [Object] cmd
//
// @return [Object] 
//
// >>===========================================================
    _openMenu(cmd) {
      //Type.setMapName(_a.reader)
      //editor.select cmd.parent
      this.debug("AZAQ PAGE MANAGER  _openMenu");
      const menu = require("hub/skeleton/settings")(this, cmd);
      const style = menu.styleOpt || {};
      style.left = cmd.$el.offset().left + cmd.$el.outerWidth() + 10;
      style.top  = cmd.$el.offset().top;
      menu.styleOpt = style;
      return gateway.openBox(_a.context, menu);
    }
  }
  __feedback_ui.initClass();
      //@_settings.feed require("./skeleton/settings")(@)
  return __feedback_ui;
});

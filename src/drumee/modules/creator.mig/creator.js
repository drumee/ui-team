/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : ../src/drumee/modules/creator/ui
//   TYPE :
// ==================================================================== *

require('./skin/creator-main');

const _colors = ['transparent', '#000000', '#D3D3D3', '#FF3466', '#18A3AC', '#18AC72', '#879BFF', '#FA8540', '#FFFFFF', '#FFAB00', '#FF9474', '#00FFD4', '#AD20AC', '#9E9E9E', '#888888', '#6F6F6F', '#545454', '#343434', '#000000', '#333333'];
const _grey_colors = ['#FFFFFF', '#E4E4E4', '#D1D1D1', '#B3B3B3', '#9E9E9E', '#888888', '#6F6F6F', '#545454', '#343434', '#000000'];
window._colors_list = window._colors_list || _colors;

class __creator_module extends LetcBox {
  constructor(...args) {
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.forceChange = this.forceChange.bind(this);
    this._registerClasses = this._registerClasses.bind(this);
    this.initDraft = this.initDraft.bind(this);
    this.ensureSection = this.ensureSection.bind(this);
    this.contentChanged = this.contentChanged.bind(this);
    this.toggleGrid = this.toggleGrid.bind(this);
    this.toggleDevice = this.toggleDevice.bind(this);
    this.initDevice = this.initDevice.bind(this);
    this.switchToDesktop = this.switchToDesktop.bind(this);
    this._send = this._send.bind(this);
    this.onUploadStart = this.onUploadStart.bind(this);
    this.onUploadEnd = this.onUploadEnd.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.route = this.route.bind(this);
    this._serialize = this._serialize.bind(this);
    this.savePage = this.savePage.bind(this);
    this.makeMaidenPage = this.makeMaidenPage.bind(this);
    this._changeDevice = this._changeDevice.bind(this);
    this.checkSanity = this.checkSanity.bind(this);
    this.addLanguage = this.addLanguage.bind(this);
    this._openNewTab = this._openNewTab.bind(this);
    this.setupPrebuilts = this.setupPrebuilts.bind(this);
    this.__dispatchRest = this._dispatch.bind(this);
    this.recover = this.recover.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.rename = this.rename.bind(this);
    this.serial = this.serial.bind(this);
    this.currentRoot = this.currentRoot.bind(this);
    this.resetPage = this.resetPage.bind(this);
    this.maidenPage = this.maidenPage.bind(this);
    this._should_reset = this._should_reset.bind(this);
    this._should_save = this._should_save.bind(this);
    this.loadPage = this.loadPage.bind(this);
    this._preview = this._preview.bind(this);
    this._headerMenu = this._headerMenu.bind(this);
    this._display = this._display.bind(this);
    this.setPageName = this.setPageName.bind(this);
    this.updateHeight = this.updateHeight.bind(this);
    this.refreshHeight = this.refreshHeight.bind(this);
    this.ensureHeight = this.ensureHeight.bind(this);
    this.setHeight = this.setHeight.bind(this);
    this.__debug__ = this.__debug__.bind(this);
    this.listrefersh = this.listrefersh.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.figName    = "creator_module";
    this.prototype.behaviorSet = {
      bhv_socket: 1,
      bhv_uploader: 1
    };
  }

// =========================================================
//
// =========================================================
  initialize(opt) {
    this._registerClasses();
    this.checkSanity();
    super.initialize();
    this._serial = 0;
    this.zoom = 1;

    if ((localStorage.workdevice == null)) {
      if (window.innerWidth < 1000) {
        localStorage.workdevice = _a.mobile;
      } else { 
        localStorage.workdevice = _a.desktop;
      }
    }

    window.onbeforeunload = e=> {
      Backtrack.trigger(_e.change);
      return false;
    };
    this.declareHandlers();

    Backtrack.on(_e.change, ()=> {
      const data = this._serialize('');
      localStorage.draft = JSON.stringify(data);
      this.trigger(_e.update, data);
      if (Backtrack._pointer === 0) {
        this._changed = false;
      } else {
        this._changed = true;
      }
      return false;
    }); 

    // Export global for direct access in skeletons and helpers
    return window.Editor = this;
  }
    //Cop.sleep()

// =========================================================
//
// =========================================================
  onBeforeDestroy() {
    return Panel.destroy();
  }

// =========================================================
//
// =========================================================
  forceChange(a) {
    if (a == null) { a = true; }
    return this._changed = a;
  }

// =========================================================
//
// =========================================================
  _registerClasses() {
    // In case of too early call, check before usage
    this.lazyLoader = {};

    Kind.register('language_manager', require('./language/language'));
    Kind.register('language_item', require('./language/item/language'));
    Kind.register('page_manager', require('./page/page'));

    Kind.register('panel_main', require('./panel/panel'));
    Kind.register('page_ui', require('editor/page/ui'));
    Kind.register('editor_map', require('./map'));
    Kind.register('helper_text', require('editor/helper/text'));
    Kind.register('helper_button', require('editor/helper/button'));
    Kind.register('styles_text', require('editor/helper/styles'));

    require.ensure(["application"], e=> {
      Kind.register('color_picker', require('builtins/widget/colorpicker'));
      Kind.register('sides_manager', require('editor/sides/manager'));
      Kind.register('color_toolbox',   require('editor/color/ui'));
      return Kind.register('gradient_manager', require('editor/color/gradient'));
    });

    require.ensure(["application"], e=> {
      Kind.register('photo_manager', require('editor/photo/manager'));
      return this.lazyLoader.photo_manager = Kind.get('photo_manager');
    });

    require.ensure(["application"], e=> {
      Kind.register("icons_manager", require('editor/icons/manager'));
      Kind.register("link_manager", require('editor/link/manager'));
      return Kind.register('anchor_ui', require('editor/anchor/ui'));
    });

    require.ensure(["application"], e=> {
      Kind.register('menu_ui', require('editor/menu/ui'));
      Kind.register('menu_manager', require('editor/menu/manager'));
      this.lazyLoader.menu_ui = Kind.get('menu_manager');
      return this.lazyLoader.menu_manager = Kind.get('menu_manager');
    });

    require.ensure(["application"], e=> {
      Kind.register("styles_manager", require('editor/style/ui'));
      return this.lazyLoader.styles_manager = Kind.get('styles_manager');
    });

    require.ensure(["application"], e=> {
      Kind.register("form_manager", require('editor/form/manager'));
      return this.lazyLoader.form_manager = Kind.get('form_manager');
    });

    require.ensure(["application"], e=> {
      Kind.register("map_manager", require('editor/map/manager'));
      return this.lazyLoader.map_manager = Kind.get('map_manager');
    });

    require.ensure(["application"], e=> {
      Kind.register("shape_manager", require('editor/shape/manager'));
      return this.lazyLoader.shape_manager = Kind.get('shape_manager');
    });

    require.ensure(["application"], e=> {
      Kind.register("entry_manager", require('editor/entry/manager'));
      return this.lazyLoader.entry_manager = Kind.get('entry_manager');
    });

    return require.ensure(["application"], e=> {
      Kind.register("fonts_manager", require('editor/fonts/manager'));
      return this.lazyLoader.fonts_manager = Kind.get('fonts_manager');
    });
  }

// =========================================================
//
// =========================================================
  initDraft(draft) {
    this._changed = false;
    draft.feed(require('./skeleton/workspace/draft')(this));
    this.draft = draft;

    this.page  = draft.children.first();
    this._meta = new Backbone.Model({
      device  : localStorage.workdevice || _a.desktop,
      lang    : localStorage.pagelang || Visitor.language(),
      version : Drumee.version.letc,
      editor  : _a.creator,
      hashtag : LOCALE.DRAFT,
      id      : 0
    });
    draft._childCreated = c=> {
      this._changed = false;
      if (c.get(_a.meta)) {
        this._meta.set(c.get(_a.meta));
        this.page  = draft.children.findByIndex(0);
      }
      return Backtrack.initialize();
    };

    draft.$el.append(`<div id=\"${this._id}-grid\" class=\"grid-box\"></div>`);
    this.initDevice();

    const f = ()=> {
      return this.ensureSection();
    };

    return _.delay(f, 500);
  }


// ===========================================================
//
// ===========================================================
  ensureSection() {
    let ok = false; 
    for (let c of Array.from(this.page.children.toArray())) {
      if (c.mget(_a.kind) === _t.designer.section) {
        ok = true;
        break; 
      }
    }
    
    if (!ok) {
      return this.page.feed(require('./skeleton/workspace/default-section')());
    }
  }

// ===========================================================
// contentChanged
// ensures to have at least one section in the page
// https://taiga.drumee.eu/project/standlsg-private-beta-1/task/304
// @param [Object] e
//
// ===========================================================
  contentChanged(view) {
    if (view != null) {
      this._changed = !_.isEmpty(view.model.changed);
    }
    if (Backtrack._pointer === 0) {
      return false;
    }
    return this._changed;
  }

// ===========================================================
// toggleGrid
//
// @param [Bool] state
//
// @return [Object]
//
// ===========================================================
  toggleGrid(state){
    this.grid = this.$el.find(`#${this._id}-grid`).attr("data-grid", state);
    return this.debug('toggleGrid_ui', this.grid);
  }
    // @set _a.grid, state
    // if @_curSelect?
    //   @_curSelect.triggerMethod _a.grid, state

// ===========================================================
//
// ===========================================================
  toggleDevice(skip_reload){
    if (skip_reload == null) { skip_reload = false; }
    if (localStorage.workdevice === _a.mobile) {
      localStorage.workdevice = _a.desktop;
    } else { 
      localStorage.workdevice = _a.mobile;
    }
    Visitor.set({ 
      device : localStorage.workdevice});
    return this.initDevice(skip_reload);
  }

// ===========================================================
//
// ===========================================================
  initDevice(skip_reload){
    if (this._meta.get(_a.id) && (this._meta.get(_a.device) !== localStorage.workdevice)) {
      if (!skip_reload) { 
        this.loadPage(this._meta.get(_a.hashtag));
        return;
      }
    }

    this.draft.children.first().$el.addClass(`creator__page creator__page--${localStorage.workdevice}`); 
    this.draft.$el.attr('data-work-screen', localStorage.workdevice);
    if (localStorage.workdevice === _a.mobile) {
      this.model.set({ 
        width    : 512,
        gridsize : 32
      });
      return Env.set({ 
        width    : 512,
        gridsize : 32
      });
    } else { 
      this.model.set({ 
        width    : 1280,
        gridsize : 32
      });
      return Env.set({ 
        width    : 1280,
        gridsize : 32
      });
    }
  }

// ===========================================================
//
// ===========================================================
  switchToDesktop(state){
      this.model.set({ 
        width    : 1280,
        gridsize : 32
      });
      Env.set({ 
        width    : 1280,
        gridsize : 32
      });
      return localStorage.workdevice = _a.desktop;
    }

// ===========================================================
// _send
//
// @param [Object] e
//
// ===========================================================
  _send(e) {
    return this.triggerMethod(_e.transfert, e.target.files, this._currentPid);
  }

// ===========================================================
// onUploadStart
//
// @param [Object] uploader
//
// ===========================================================
  onUploadStart(uploader) {
    const a=Keeper.currentView();
    this.debug("<<vvMANAGER onUploadStart", uploader, this._currentPid);
    return a.el.style.opacity=0.4;
  }

    //uploader.set _a.uploader, @_uploader
    // item = uploader.toJSON()
    // # Forward the uploader for progress updating
    // item.uploader = uploader
    // item.kind   = _t.media.helper
    // @getPart(_a.list).prepend item

// ===========================================================
// onUploadEnd
//
// @param [Object] uploader
//
// ===========================================================
  onUploadEnd(data, socket) {
    const a=Keeper.currentView();
    this.debug("<<vvMANAGER onUploadEnd", data, socket, a);
    a.el.style.opacity=1;
    //image_model = new Backbone.Model(data)
    return a.mould(data);
  }


// >>=========================================================
// onDestroy
//
// @return [Object]
//
// >>=========================================================
//    onDestroy:()=>
//      #Type.setMapName(_a.reader)
//      window.onbeforeunload = null
//      $(window).on 'beforeunload', ()->
//        return null

// >>=========================================================
// onDomRefresh
//
// >>=========================================================
  onDomRefresh() {
    this.setMapName(_a.reader);
    this.feed(require("./skeleton/main")(this));
    this.route();
    return this._initWidth  = $('#--router').width();
  }
    //@$el.prepend("<canvas id=\"#{@_id}-editor\" class=\"ruler-canvas\">")
  //

// >>=========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// @return [Object]
//
// >>=========================================================
  onPartReady(child, pn, section) {
    this.debug(">>2233 CHILD CREATOR READY WIDGET", pn, child);
    if (section !== _a.sys) {
      return;
    }
    switch (pn) {
      case _a.draft:
        this._draftWrapper = child;
        return this.initDraft(child);

      case 'creator-ui':
        if (this.page.isEmpty()) {
          return this.page.feed(require('./skeleton/workspace/default-section')());
        }
        break;
          //@rescale()

      case 'fselector':
        this._fileselector = child.$el.find(_a.input);
        if (this._fileselector) {
          return this._fileselector.on(_e.change, this._send);
        }
        break;

      case 'pseudo-box-w':
        var f =()=> {
          const {
            x
          } = this._draftWrapper.el.getBoundingClientRect();
          child.el.style.left = Utils.px(x - 50);
          return this.debug("HJHGG", x, child.el.style.left);
        };
          //child.el.style 
        return Utils.waitForEl(this._draftWrapper, f);

      case 'pseudo-box-e':
        f =()=> {
          const r = this._draftWrapper.el.getBoundingClientRect();
          this.debug("HJHGG", r.x, r.width, r.x + r.width, child.el);
          return child.el.style.left = Utils.px(r.x + r.width);
        };
        return Utils.waitForEl(this._draftWrapper, f);


      default:
        return this.warn(_WARN.bad_value.format(pn, 'onPartReady'), this);
    }
  }


// >>=========================================================
// route
//
// @param [Object] opt
//
// @return [Object]
//
// >>=========================================================
  route(opt) {
    let prebuilts;
    let e;
    opt = location.hash.split(_USING.regexp.urlSeparator);
    opt.shift();
    let section = opt[0];
    const tab = opt[1];
    const options = opt[2];
    this.debug("ghjkltyui", opt);
    this.debug(`EZEZEZZE AAA route section=${section}, ${tab}, prev =${opt[0]}`);

    switch (tab) {
      case '!reset':
        this.maidenPage();
        location.reload();
        return;
        break;

      case '!version':
        Info.gitLog();
        return;
        break;

      case '!trial':
        var sections = JSON.parse(localStorage.build_sections);
        this.debug("TRIAL", sections);
        for (let s of Array.from(sections)) {
          Type.convert(s, _a.designer);
        }
        this.debug("TRIAL QQQQ", sections);
        this.page.feed(sections);
        //@rescale()
        return;
        break;

      case '!pre-build':
        try { 
          prebuilts = JSON.parse(localStorage.builderData);
        } catch (error) { 
          e = error;
          this.warn("Failed to load pre builts", e);
        }
        this.debug("JJJJJJ PREBUILTS", prebuilts);
        if (!_.isEmpty(prebuilts)) {
          this.setupPrebuilts(prebuilts);
        }
        return;
        break;

      case '!delay':
        section = null;
        break;
    }

    if (!_.isEmpty(tab)) {
      // @debug "is not Empty check", section
      this.loadPage(tab);
      return;
    }

    if (!_.isEmpty(localStorage.draft)) {
      try {
        const data = JSON.parse(localStorage.draft);
        const letc = Type.convert(data.letc, _a.designer);
        this._meta.clear();
        this.page.feed(letc.kids);
        //@rescale()
        const bo = data.buildOpt || {};
        if (bo.scroll != null) {
          const f = () => window.scrollTo(bo.scroll.x, bo.scroll.y);
          _.delay(f, 1000);
        }
        return;
      } catch (error1) {
        e = error1;
        this.warn("Failed to load draft", e);
        this.debug(localStorage.draft);
        delete localStorage.draft;
        //Utils.popup("Your last work has crahed and could not be retrieved")
        this.resetPage();
        return;
      }
    }

    return this.resetPage();
  }
  //


// >>=========================================================
// _serializepostService()
//
// @return [Object] letc
//
// >>=========================================================
  _serialize(status, publish_status) {
    if (publish_status == null) { publish_status = ""; }
    const hashtag = this._meta.get(_a.hashtag) || `${Visitor.get(_a.ident)}-${Utils.date('YY-MM-DD_HHmmss')}`;
    //letc = @page.serializeData()
    let letc = this.page.toLETC(0);
    letc = Type.convert(letc, _a.reader);
    const r =  this.page.el.getBoundingClientRect(); //window.getComputedStyle(@page.el)
    //lang = localStorage.pagelang # @_meta.get(_a.lang)
    const lang = localStorage.pagelang;
    this.debug(`LANGGGGGGG = ${lang}` , this._meta.get(_a.id), this._meta);
    const data = {
      hashtag,
      type      : this._meta.get(_a.type) || _a.block,
      editor    : _a.creator,
      lang      : localStorage.pagelang, //@_meta.get(_a.lang)
      comment   : `Created by ${Visitor.get(_a.fullname)} on ${Utils.date('YYYY-MM-DD hh:mm')}`,
      letc,
      device    : localStorage.workdevice, //@_meta.get(_a.device)
      version   : this._meta.get(_a.version),
      id        : this._meta.get(_a.id),
      status    : localStorage.status || publish_status,
      serial    : this._meta.get(_a.serial) || -1,
      vhost     : location.hostname,
      author_id : Visitor.get(_a.id),
      owner_id  : Host.get(_a.id),
      //ffff
      buildOpt : {
        width  : this.mget(_a.width),// - 15
        height : r.height,
        scroll : {
          x : window.scrollX,
          y : window.scrollY
        }
      },
      meta    : {
        responsive : this._meta.get(_a.responsive),
        editor     : _a.creator,
        lang       : localStorage.pagelang, //@_meta.get(_a.lang)
        comment    : `Created by ${Visitor.get(_a.fullname)} on ${Utils.date('YYYY-MM-DD hh:mm')}`,
        type       : this._meta.get(_a.type) || _a.block,
        hashtag,
        buildOpt   : {
          width    : this.mget(_a.width),// - 15 #Env.get(_a.width)
          height   : r.height,
          device   : localStorage.workdevice
        }
      }
    };
    this._meta.set({ 
      device  : data.device,
      lang    : data.data
    });
    this.debug(`Qaaa 757 QQ saved ${data.device}`, publish_status, data);
    //@shadowDraft = data
    return data;
  }


// >>=========================================================
// savePage
//
// >>=========================================================
  savePage(cmd) {
    let skl;
    this.debug(`resultsresults status=${cmd.status}`, cmd, cmd.source);
    const err_box = cmd.getPart('error-box');
    switch (cmd.status) {
      case _e.cancel:
        return Panel.closeBox(_popup.main);
      case _a.results:
        if (_.isEmpty(cmd.source.results)) {
          const currentValue = cmd.source.model.get(_a.value);
          //matchPattern = /^[a-zA-Z0-9_\-/b]+$/
          err_box.clear();
          if (currentValue.match(_REQUIRE.pagename) || (currentValue === "")) {
            return err_box.clear();
          } else {
            skl = SKL_Note(null, null, {
              className : "fill-up inline-error",
              content   : LOCALE.SPECIAL_CHAR_NOT_ALLOWED
            });
            return err_box.feed(skl);
          }
          //@_pendingError = 1
        } else {
          const val = cmd.source.model.get(_a.value);
          skl = SKL_Note(null, null, {
              className : "fill-up inline-error",
              content   : (val.printf(LOCALE.PAGE_ALREADY_EXISTS))
          });
          return err_box.feed(skl);
        }
          //@_pendingError = 1
        
      case _e.commit:
        this.debug("commitcommit", cmd.model.get("page_name"), cmd.source.model.get(_a.value));
        var pageName = cmd.model.get("page_name") || cmd.source.model.get(_a.value);
        if (!err_box.isEmpty()) {
          return;
        }
        this._meta.set(_a.hashtag, encodeURI(pageName.name));
        var data = this._serialize(status);
        data.service =  _SVC.block.store;
        if (_.isEmpty(data.lang)) {
          Cop.say(LOCALE.CHOOSE_YOUR_LANG);
        }
        this.debug("save-success called", data);
        this.postService(data);
        return Panel.closeBox(_popup.main);
    }
  }

// >>=========================================================
// makeMaidenPage
//
// @return [Object] letc
//
// >>=========================================================
  makeMaidenPage(hashtag, publish_status) {
    if (publish_status == null) { publish_status = ""; }
    let letc = require('creator/skeleton/workspace/default-section')();
    letc = Type.convert(letc, _a.reader);
    const r =  this.page.el.getBoundingClientRect(); //window.getComputedStyle(@page.el)
    const lang = localStorage.pagelang || Visitor.language();
    this.debug("aaaaa 558", localStorage.pagelang, lang); 
    //@debug "LANGGGGGGG = #{lang}" , @_meta.get(_a.id), @_meta
    const data = {
      hashtag,
      type     : _a.block,
      editor   : _a.creator,
      lang,
      comment  : `Created by ${Visitor.get(_a.fullname)} on ${Utils.date('YYYY-MM-DD hh:mm')}`,
      letc,
      device   : localStorage.workdevice,
      version  : this._meta.get(_a.version),
      id       : 0,
      status   : localStorage.status || publish_status,
      serial   : -1,
      //ffff
      buildOpt : {
        width  : Env.get(_a.width),
        height : r.height,
        scroll : {
          x : window.scrollX,
          y : window.scrollY
        }
      },
      meta    : {
        responsive : this._meta.get(_a.responsive),
        editor  : _a.creator,
        comment : `Created by ${Visitor.get(_a.fullname)} on ${Utils.date('YYYY-MM-DD hh:mm')}`,
        type    : this._meta.get(_a.type) || _a.block,
        buildOpt : {
          width  : Env.get(_a.width),
          height : r.height,
          device   : localStorage.workdevice
        }
      }
    };
    //@debug "QQQ dpdpdpdpdpdp", publish_status
    return data;
  }


// >>=========================================================
// _changeDevice
//
// @param [Object] device
//
// >>=========================================================
  _changeDevice(device) {
    this._meta.set(_a.device, device);
    return localStorage.workdevice = device;
  }
  //

// >>=========================================================
// checkSanity
//
// >>=========================================================
  checkSanity() {
    // if no_lang_set
    this.debug("_openNewTab checkSanity dawwwwwwwwwwww");
    return this.fetchService({ 
      service:_SVC.lang.get_languages});
  }

// >>=========================================================
// addLanguage
//
// >>=========================================================
  addLanguage() {
    const browserlanguage = navigator.language.split("-")[0];
    //@debug "aaaaaa 617", browserlanguage
    return this.postService({
      service:_SVC.lang.add, 
      locale:browserlanguage, 
      restore:0, 
      option: 0
    });
  }
    


// >>=========================================================
// _openNewTab
//
// >>=========================================================
  _openNewTab() {
    const hashtag = this.model.get(_a.hashtag);
    this.debug("_openNewTab", hashtag);
    if ((window.open(`#${hashtag}`, '_blank') == null)) {
      return alert(LOCALE.WINDOW_BLOCKED);
    }
  }
  //
// >>=========================================================
// setupPrebuilts
//
// @return [Object] letc
//
// >>=========================================================
  setupPrebuilts(data) {
    this.prebuiltDraftNames = [];
    this.prebuiltDraft = {};
    for (let k in data.pages) {
      const v = data.pages[k];
      const item = { 
        kind       : 'page_ui',
        hashtag    : v.page_name,
        id         : v.page_id,
        signal     : _e.ui.event,
        service    : 'load-prebuilt',
        radio      : _a.parent,
        mode       : _a.local,
        role       : _a.page,
        flow       : _a.vertical,
        className  : "change-page__item",
        handler    : {
          ui       : this
        }
      };
      this.prebuiltDraftNames.push(item);
    }

    //@debug "JJJJJJJ", data, data.pages[data.id]
    //@initDraft(@draft)
    //@draft.feed require('./skeleton/workspace/draft')(@)
    //@page  = @draft.children.first()
    if (!_.isEmpty(data.pages[data.page_id])) {
      this.prebuiltDraft = data.pages;
      this.initDraft(this.draft);
      const f =()=> {
        const letc = Type.convert(data.pages[data.page_id], _a.designer);
        return this.page.feed(letc.kids);
      };
      Utils.waitForEl(this.page.el, f);
      return this.setPageName(_L(data.page_name));
    }
  }
    //Backbone.history.navigate("#/creator")
  

// >>=========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
// @param [Object] socket
//
// >>=========================================================
  __dispatchRest(method, data, socket) {
    this.debug("__dispatchRest AAAAAQQQ AEAEZEZRRZRZ", method, data, socket);
    const status = this.getPart('status');
    const hashtag = socket.get(_a.hashtag);
    switch (method) {
      case _SVC.block.store:
        this.debug("orange _SVC.block.store when");
        //@resetPage(socket)    
        if (data.error === '_block_name_exist') {
          return Utils.popup('Page name already exist');
        } else {
          this.debug("orange _SVC.block.store else");
          this._meta.set(data);
          //gateway.getPart(_a.context).clear()
          //localStorage.workdevice = data.device || _a.desktop
          Panel.closeBox(_popup.main);
          Backbone.history.navigate(`${_K.module.creator}/${data.hashtag}`);
          return this._changed = false;
        }

      case _SVC.lang.get_languages:
        if (data.length === 0) {
          return this.addLanguage();
        }
        break;
          

      case _SVC.block.content:
        // @resetPage(socket)
        // Editor.mould()
        this._meta.set({
          hashtag : data.hashtag || hashtag,
          serial  : data.active || socket.get(_a.serial),
          id      : data.id, 

          lang    : data.lang || socket.get(_a.lang) || Env.get(_a.lang),
          status  : socket.get(_a.status)
        });
        if ((data.hashtag == null)) {
          data.hashtag = hashtag;
        }

        this.setPageName(decodeURI(hashtag));
        this.debug("aaa 757 _display _SVC.block.content: ", data, socket);
        
        this._display(data);
        Page.clearList();
        return Backbone.history.navigate(`${_K.module.creator}/${hashtag}`);

      case _SVC.block.purge:
        if (this._meta.get(_a.hashtag) === hashtag) {
          return this.resetPage();
        }
        break;

      case _SVC.block.info: 
        this._meta.set({
          id      : data.id,  
          active  : data.active,
          mtime   : data.mtime,
          serial  : data.active
        });
        this.debug(`aaa 777 WW id=${this._meta.get(_a.id)}`, data, this._meta);
        return this.debug("aaa 777 UU ", this._meta.attributes.id);

      default:
        return this.warn(_WARN.method.unprocessed.format(method), data);
    }
  }

// >>=========================================================
// recover
//
// @param [Object] hashtag
//
// @return [Object]
//
// >>=========================================================
  recover(hashtag) {
    if ((localStorage[`backup-${hashtag}`] == null)) {
      Utils.popup(`the page *${hashtag}* was not found`);
      return;
    }
    return this._display(JSON.parse(localStorage[`backup-${hashtag}`]));
  }
  // Delegates services to the panel manager


// >>=========================================================
// onUiEvent
//
// @param [Object] btn
//
// >>=========================================================
  onUiEvent(cmd) {
    const service = cmd.model.get(_a.service) || cmd.model.get(_a.name);
    this.debug(`AAA menuEvents AAAAA service=${service} -->`, cmd);
    // @debug "menuEvents service mio -->", service
    switch (service) {
      case 'homepage':
        return this.triggerMethod(_e.rpc.read, {
          method : _RPC.layout.get,
          id  : Host.get(_a.home)
        }
        );

      case 'newpage':
        return this._should_reset();

      case _e.reset:
        return this._should_reset();

      case _a.save:
        if (cmd._currentEvent.shiftKey &&  cmd._currentEvent.ctrlKey) {
          this._meta.unset(_a.id);
          this._should_save();
          return; 
        }
          
        if (Visitor.get(_a.online) === _a.off) {
        // if _.isEmpty(@_meta.get(_a.id)) and @_meta.get(_a.id) is undefined
          this._should_save();
          return; 
        }

        if (_.isEmpty(this._meta.get(_a.id))) { //and @_meta.get(_a.id) is undefined
          return this._should_save();
        } else {
          const question = LOCALE.YOUR_CHANGES_WILL_BE;
          const content = require("./skeleton/popup-save-draft-publish-page")(this, question);
          const panel = SKL_Confirm(this, null, null, {
            kids:content,
            confirm:"restore",
            source:this
          });
          //gateway.openBox _a.context, panel, _a.modal
          return Panel.openBox(_popup.main, panel);
        }
          
      case "close-popup":
        //gateway.closePart(_a.context)
        return Panel.closeBox(_popup.main);

      case _a.save_as:
        return this._saveAs();

      case 'login': 
        if (!Cop.checkPrivilege(_K.privilege.delete, true)) {
          return;
        }
        break;
      
      case _e.logout:
        if (confirm(LOCALE.LAYOUT_ALREADY_LOADED)) {
          this._logging_out = true;
          return location.href=_K.route.private.logout;
        }
        break;

      case _e.preview:
        return this._preview();

      case "header-menu":
        return this._headerMenu();

      case _e.view:
        return this._openNewTab();

      case _e.upload:
        return this._$fsel.click();

      case "load-prebuilt":
        this.debug("load-prebuilt", cmd);
        var letc = this.prebuiltDraft[cmd.model.get(_a.id)];
        if (letc != null) {
          this.initDraft(this.draft);
          const f =()=> {
            letc = Type.convert(letc, _a.designer);
            return this.page.feed(letc.kids);
          };
          Utils.waitForEl(this.page.el, f);
          this.setPageName(_L(letc.page_name));
          return this.listrefersh();
        }
        break;

      case "import-from-computer":
        this._currentService = service;
        return this._fileselector.click();
      // DESIGNER FORWADING EVENT

      case "pages":
        return this._togglePagesBox();
      
      case "publish-success":
        var data = this._serialize(status, "publish_with_history");
        this.debug("publish-success called", data);
        data.service =  _SVC.block.store;
        this.postService(data);
        //gateway.getPart(_a.context).clear()
        return Panel.closeBox(_popup.main);

      case "draft-success":
        data = this._serialize(status, "draft_with_history");
        // @debug "draft-success called", data
        data.service =  _SVC.block.store;
        this.postService(data);
        //gateway.getPart(_a.context).clear()
        return Panel.closeBox(_popup.main);

      case "save-page":
        return this.savePage(cmd);

      case "version":
        //uiRouter.getPart(_a.context).clear()
        return Panel.closeBox(_popup.main);

      case _a.grid:
        var state = Utils.toOnOff(cmd.model.get(_a.state));
        return this.toggleGrid(state);

      case _a.device:
        this.debug("aaaaaaaaaa lastClick", lastClick);
        //state = Utils.toOnOff(cmd.model.get(_a.state))
        return this.toggleDevice(lastClick.ctrlKey&lastClick.shiftKey);

      default:
        // In case the current view has lost the toolbox binding
        // redirect the events
        var cv = Keeper.currentView() || Keeper.currentList()[0];
        if (cv != null) {
          return cv.triggerMethod(_e.ui.event, cmd);
        } else {
          return this.warn(_WARN.method.unprocessed.format(service));
        }
    }
  }
      // WIDGET OPTIONS MUST NOT MANAGED HERE
      // THEY MUST BE MANAGED THROUGH BEHAVIORS interact and updater
      // SEE FOR EXAMPLE ./skeleton/toolbox/text/edit
      // ALL CSS PROPERTIES ALL MANAGED TRHOUGH A SINGLE API SERVICE _a.styleOpt

// **********************************************************************************
//                         END OF USER INTERFACE SECTION
// **********************************************************************************
// **********************************************************************************
//                              START OF EDITION/SELECTION SECTION
// **********************************************************************************

// >>=========================================================
// rename
//
// @param [Object] model
//
// @return [Object]
//
// >>=========================================================
  rename(model) {
    const hashtag = model.get(_a.hashtag);
    if (this._meta.get(_a.id) !== model.get(_a.id)) {
      return; // The page open is not the one being renamed
    }
    return this.updatePage(model);
  }
    //@_meta.set(_a.hashtag, hashtag)
    //@page.model.set(_a.hashtag, hashtag)
    //@page.model.set(_a.id, model.get(_a.id))
    //Backbone.history.navigate("#{_K.module.creator}/#{hashtag}")

// >>=========================================================
// serial
//
// @param [Object] a
//
// @return [Object]
//
// >>=========================================================
  serial(a) {
    if (!a) {
      this._serial = 0;
      return this._serial;
    }
    this._serial = this._serial + a;
    return this._serial;
  }
  //



// >>=========================================================
// currentRoot
//
// @return [Object]
//
// >>=========================================================
  currentRoot() {
    return this.page;
  }

// >>=========================================================
// rescale
//
// @return [Object]
//
// >>=========================================================
  // rescale:() =>
  //   max =  600
  //   @page.children.each (c)=>
  //     w = parseInt(c.style.get(_a.width)) || window.innerWidth
  //     if w > max
  //       max = w
  //       @debug "JSJSHSHSHS", w , max
  //   @debug "JSJSHSHSHS", max
  //   if max > 600
  //     @zoom = window.innerWidth/max
  //     document.body.style.zoom = @zoom
  //     #document.body.style.transform = "scale(#{window.innerWidth/max})"
  //     #document.body.style.transformcmdin = "0 0"
  //     #$('body').css {zoom: zoom}

// >>=========================================================
// reset_page
//
// @param [Object] keep_root=no
// @param [Object] hashtag
//
// @return [Object]
//
// >>=========================================================
  resetPage(model, hard) {
    if (hard == null) { hard = false; }
    this._meta.clear();
    this.page.clear();
    this._meta.set(_a.lang, Env.get(_a.lang));
    this._meta.set(_a.device, Env.get(_a.device));
    localStorage.draft = '';
    if ((model == null)) {
      if (hard != null) {
        Backbone.history.navigate(_K.module.creator);
        //location.reload()
      } else {
        this.page.feed(require('./skeleton/workspace/default-section')());
        //@rescale()
        this.setPageName(LOCALE.DRAFT);
      }
      return;
    }
    const hashtag = model.get(_a.hashtag);
    this._meta.set(_a.hashtag, hashtag);
    this.setPageName(hashtag);
    return Backbone.history.navigate(`${_K.module.creator}/${hashtag}`);
  }
  //

// >>=========================================================
// maidenPage
//
// @param [Object] keep_root=no
// @param [Object] hashtag
//
// @return [Object]
//
// >>=========================================================
  maidenPage(data) {
    localStorage.draft = '';
    this.initDraft(this.draft);
    //@draft.feed require('./skeleton/workspace/draft')(@)
    //@page  = @draft.children.first()
    const f =()=> {
      return this.page.feed(require('./skeleton/workspace/default-section')());
    };
    Utils.waitForEl(this.page.el, f);
    this.setPageName(LOCALE.DRAFT);
    return Backbone.history.navigate(_K.module.creator);
  }

// >>=========================================================
// _should_reset
//
// @return [Object]
//
// >>=========================================================
  _should_reset() {
    if (this._changed != null) {
      const panel = SKL_Confirm(this, LOCALE.LAYOUT_ALREADY_LOADED, "Changes will be lost", {confirm:_e.reset});
      //gateway.openBox _a.context, panel, _a.modal
      Panel.openBox(_popup.main, panel);
      return false;
    }
    return true;
  }

// >>=========================================================
// _should_save
//
// @return [Object]
//
// >>=========================================================
  _should_save(status) {
    this.debug("_should_save called sfdgdgdg -->", _K.privilege.delete);
    if (!Cop.checkPrivilege({required_privilege : _K.privilege.delete})) {
      this.warn("WEAK PRIVILEGE");
      return;
    }
    if (this.page != null ? this.page.isEmpty() : undefined) {
      Utils.popup("Nothing to save");
      return;      
    }
    const panel = require('./skeleton/form/save')(this);
    //gateway.openBox _a.context, panel, _a.modal
    return Panel.openBox(_popup.main, panel);
  }

    // question = "Your changes will be "
    // content = require("creator/skeleton/popup-save-draft-publish-page")(@, question)
    // panel = SKL_Confirm(@, null, null, {kids:content, confirm:"restore", source:@})
    // gateway.openBox _a.context, panel, _a.modal

// >>=========================================================
// loadPage
//
// @param [Object] cmd
//
// @return [Object]
//
// >>=========================================================
  loadPage(cmd) {
    let hashtag, serial, status;
    this.debug(`aaa 757 asking for device=${localStorage.workdevice} check-->`, this._meta, cmd);
    if (_.isString(cmd)) {
      const url = 'block/' + cmd;
      hashtag = cmd;
    } else if (_.isFunction(cmd.get)) {
      hashtag = cmd.get(_a.hashtag);
      // serial  = @_meta.get(_a.serial)
      this.debug("loadPage check-->", this._meta, cmd);
      serial  = cmd.model.get('history_id') || this._meta.get(_a.active) || cmd.get(_a.serial);
      if (cmd.model.get('isonline') === "1") {
        status = "published";
      } else {
        status = "draft";
      }
    } else {
      this.warn("Invalid arguments");
      return;
    }
    
    if ((hashtag == null)) {
      this.warn("No page to load");
      return;
    }
    const opt = { 
      service  : _SVC.block.content,
      hashtag,
      pagelang : localStorage.pagelang,
      device   : localStorage.workdevice, 
      serial   : 0,
      status,
      no_cache : Utils.timestamp()
    };
    return this.fetchService(opt);
  }
    
    // if serial
    //   @triggerMethod _e.service.read,
    //     service : _SVC.block.content
    //     hashtag : hashtag
    //     serial  : serial
    // else
    //   @triggerMethod _e.service.read,
    //     service : _SVC.block.content
    //     hashtag : hashtag


// >>=========================================================
// _preview
//
// >>=========================================================
  _preview() {
    if (this._meta.get(_a.hashtag) && !this._changed) {
      const hash = `?device=${localStorage.workdevice}&pagelang=${localStorage.pagelang}#!${this._meta.get(_a.hashtag)}`;
      if ((window.open(hash, '_blank') == null)) {
        Cop.say(LOCALE.WINDOW_BLOCKED);
      }
      return;
    }
    let a = this.page.serializeData();
    a = Type.convert(a, _a.reader);
    a.meta = a.meta || {};
    const meta = {
      comment : `Created by ${Visitor.get(_a.fullname)} on ${Utils.date('YYYY-MM-DD hh:mm')}`,
      editor  : _a.creator,
      buildOpt : {
        width   : Env.get(_a.width), //- 13 #@page.$el.innerWidth() - 17  #@_initWidth
        height  : this.page.$el.innerHeight()
      } //@_initHeight
    };
    _.merge(a.meta, meta);
    //a.meta = a.meta || meta

    localStorage.preview=JSON.stringify(a);

    if ((window.open("#/preview", '_blank') == null)) {
      return Cop.say(LOCALE.WINDOW_BLOCKED);
    }
  }

// >>=========================================================
// _headerMenu
//
// >>=========================================================
  _headerMenu() {
    this.debug('uuiuiupopopo', this.getPart('header-menu'));
    const menuBlock = this.getPart('header-menu');
    if (!menuBlock.isEmpty()) {
      menuBlock.clear();
      return;
    }
    return menuBlock.feed(require('creator/skeleton/menu/header-menu')(this));
  }

// >>=========================================================
// _display
//
// @param [Object] data
// @param [Object] target
//
// >>=========================================================
  _display(data, target) {
    //@debug  "aaa 777 _display work=#{localStorage.workdevice} got=#{data.device}", @_meta.attributes.id
    let f;
    data.meta = data.meta || {};
    data.meta.id = data.id;
    data.meta.status = data.serial;
    data.meta.hashtag = data.hashtag;
    const buildOpt = data.buildOpt || data.meta.buildOpt;
    if (buildOpt != null) {
      if (buildOpt.scroll != null) {
        this.debug("_displayscroll", data);
        f = () => TweenLite.to(window, 0.5, {scrollTo:{x:0, y:buildOpt.scroll.y}});
        _.delay(f, 2000);
      }
    }
    //@draft.clear() #feed '' #clear the page
    Type.convert(data, _a.designer); //@_toDesign(data)
    if (data.device != null) { 
      if (data.device !== localStorage.workdevice) {
        data.device = localStorage.workdevice;
      }
    } else { 
      if ((localStorage.workdevice == null)) {
        localStorage.workdevice = _a.desktop;
      } else { 
        data.device = localStorage.workdevice;
      }
    }
    f = ()=> {
      this.debug(`aaa 777 _display work=${localStorage.workdevice} 2 got=${data.device}`, this._meta.attributes.id);
      this.draft.feed(data);
      this._meta.set(_a.device, data.device);
      if (_.isEmpty(data.id)) { 
        this.fetchService({ 
          service : _SVC.block.info, 
          hashtag : data.hashtag
        }); 
      }

      this.draft.children.first().$el.addClass(`creator__page creator__page--${localStorage.workdevice}`); 
      return this.draft.$el.attr('data-work-screen', localStorage.workdevice);
    };
    return _.delay(f, 300);
  }


// >>=========================================================
// setPageName
//
// @param [Object] hashtag
//
// >>=========================================================
  setPageName(hashtag) {
    const f = ()=> {
      return Page.sync(hashtag);
    };
    return Utils.waitForEl(Page.el, f);
  }


// >>=========================================================
// updateHeight
//
// @param [Object] el
//
// >>=========================================================
  updateHeight(el) {
    const h = el.offset().top + el.outerHeight();
    if (h > this.page.$el.outerHeight()) {
      this.setHeight();
    } else {
      this.refreshHeight();
    }
    this.debug("ZEZEZEZEZE updateHeight", h, el.offset().top, el.outerHeight(), el, this.page.$el.outerHeight());
    return this.pageHeight = this.page.$el.outerHeight();
  }
// Adjust the page height accordingly to its content

// >>=========================================================
// refreshHeight
//
// >>=========================================================
  refreshHeight() {
    let max = 0;
    this.page.children.each(function(c){
      const m = c.$el.offset().top + c.$el.outerHeight();
      if (m > max) {
        return max =m;
      }
    });
    return this.setHeight(max);
  }

// >>=========================================================
// ensureHeight
//
// >>=========================================================
  ensureHeight() {
    let max = 0;
    this.page.children.each(function(c){
      const r = c.el.getBoundingClientRect();
      const m = r.y + r.height;
      if (m > max) {
        return max =m;
      }
    });
    return this.setHeight(max + window.innerHeight);
  }

// >>=========================================================
// setHeight
//
// @param [Object] h
//
// >>=========================================================
  setHeight(h) {
    h = Math.max(window.innerHeight, h);
    this.page.el.style.height = _a.auto;
    this.page.el.style.minHeight = Utils.px(h);
    const style = this.page.style.toJSON();
    //page.triggerMethod('update:canvas')
    return this._meta.set(this.page.el.getBoundingClientRect());
  }


// **********************************************************************************
//                                END OF PAGES MANAGEMNTS SECTION
// **********************************************************************************
// **********************************************************************************
//                                DEBUGING SECTION
// **********************************************************************************

// >>=========================================================
// __debug__
//
// @return [Object]
//
// >>=========================================================
  __debug__(opt) {
    const data = this._serialize(status);
    if (opt != null) {
      _.merge(data, opt);
    }
    data.service =  _SVC.block.store;
    return this.postService(data);
  }

// >>=========================================================
// listrefersh
//
// @return [Object]
//
// >>=========================================================

  listrefersh() {
    this.debug("close page list");
    return Page.toggleList();
  }
}
__creator_module.initClass();


define('creator/ui', ["application"], app => __creator_module);

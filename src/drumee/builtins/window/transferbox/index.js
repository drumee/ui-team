/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : src/drumee/builtins/window/transferbox/index.js
*   TYPE : Component
* ==================================================================== */
/// <reference path="../../../../../@types/index.d.ts" />


const __window_interact_singleton = require('window/interact/singleton');
const __uploader = require('socket/uploader');
const __progress = require('libs/template/progress');


/**
 * @class ___window_transfer_box
 * @extends __window_interact_singleton
 */

class ___window_transfer_box extends __window_interact_singleton {


  static initClass() {
    this.prototype.isStream = 1;
    this.prototype.acceptMedia = 1;
    this.prototype.fig = 1;
  }

  /* ===========================================================
   *  initialize
   * ===========================================================*/
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');

    
    super.initialize(opt);
    this.transferbox = Wm.sharebox

    this.mset('home_id', this.transferbox.root_id);
    this.mset('pid', this.transferbox.root_id);
    this.mset('nid', this.transferbox.outbound);
    this.mset('hub_id', this.transferbox.hub_id);


    this.style.set({
      width: _K.iconWidth * 5,
      height: _K.iconWidth * 4
    });

    this._configs = {};
    this._view = _a.max
    this._state = 1
    this.activeNodes = {}

    this.selectedBox = _a.outbound

    this._setSize({ minHeight: _K.iconWidth * 3, minWidth: _K.iconWidth * 4 });
    this.declareHandlers();

    this.skeleton = require('./skeleton').default(this);
  }

  /**
   * @param {any} child
   * @param {any} pn
   */
  onPartReady(child, pn) {
    this.debug('onPartReady', child, pn, this)
    this.raise()

    switch (pn) {
      case _a.content:
        this._content = child;
        this.router();
        this.setupInteract();
        break;

      default:
        super.onPartReady(child, pn);
        this.debug("Created by kind builder");
    }
  }

  /**
   */
  onDomRefresh() {
    this.responsive();
  }

  /**
   * @param {any} moving
   */
  seek_insertion(moving) {
    let file;
    try {
      file = moving.event.originalEvent.dataTransfer.items[0];
    } catch (e) {
      this.warn("INVALID FILE");
    }
    return this;
  }

  /**
   * @param {string | any[]} f
   */
  insertMedia(f) {
    if (!this.__content || this.__content.isDestroyed()) return;
    let child = this.__content.children.first()
    if (child && child.insertMedia && _.isFunction(child.insertMedia)) {
      child.insertMedia(f)
    }
    return
  }

  /**
   * Abstracted
   * @note don't remove
   * @param {any} d
   */
  scrollToBottom(d) {
    // Do not remove. Abstracted.
  }

  /**
   * @param {any} cmd
   * @param {any} args
   */
  onUiEvent(cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)

    switch (service) {
      case 'switch-box':
        return this.switchBox(cmd);
      case 'send-transfer-box':
        this.sendTransferBox(cmd);
        break;
      case 'close-model':
        return this.closeModel();
      default:
        this.debug("Created by kind builder");
        // super.onUiEvent(cmd, args)
    }
    super.onUiEvent(cmd, args)
  }

  /**
   * Router
   * @param  {} page=_a.outbound
   * @param  {} options={}
   */
  router(page = _a.outbound, options = {}) {
    this.debug('router', page, options)
    let route = () => {
      this.route = page;
      switch (page) {
        case _a.outbound:
          this.debug("load Inbound page");
          this.loadOutboundPage()
          break

        case _a.inbound:
          this.debug("load Inbound page");
          this.loadInboundPage()
          break

        default:
          this.debug("Created by kind builder");
          this.loadingPage()
      }
    }
    route();
  }

  /**
   * change_view
   * @param  {} cmd
   */
  change_view(cmd) {
    if ((this.__content == null)) {
      return;
    }
    if (this.getViewMode() === _a.row) {
      this.getViewMode() = _a.icon;
      this.getPart("view-ctrl").changeState(0);
    } else {
      this.getViewMode() = _a.row;
      this.getPart("view-ctrl").changeState(1);
    }
    this.updateWindow()
    return this.getViewMode();
  }

  /**
   */
  updateWindow() {
    if (this.getViewMode() === _a.row) {
      this.__content.feed(require("../skeleton/content/row")(this));
    } else {
      this.__content.feed(require("../skeleton/content/grid")(this));
    }
  }

  /* *********************************************************
   * loadingPage
   * ********************************************************* */
  loadingPage() {
    this.__content.feed(require("./skeleton/content").default(this))
  }
  

  /**
   * switchBox
   * @param  {} cmd
   */
  switchBox(cmd) {
    if (cmd.mget(_a.type) == _a.outbound) {
      this.selectedBox = _a.outbound
      return this.loadOutboundPage()
    }

    this.selectedBox = _a.inbound
    return this.loadInboundPage();
  }

  /* *********************************************************
  * loadOutboundPage
  * ********************************************************* */
  loadOutboundPage() {
    this.mset('nid', this.transferbox.outbound);
    this.updateWindow()
  }

  /* *********************************************************
  * loadInboundPage
  * ********************************************************* */
  loadInboundPage() {
    this.mset('nid', this.transferbox.inbound);
    this.updateWindow()
  }

  sendTransferBox(cmd = {}){
    this.openModel({
      content: {
        kind: 'transferbox_nondrumeete_sendform',
        uiHandler: [this]
      },
      header: 'Send a transfer box to',
      footer: 'Footer',   
    })
  }

  openModel(options){
    let content =  require('./skeleton/model').default(this,options);
    // this.__wrapperDialog.feed({kind:'note', content: 'test'})
    this.__wrapperDialog.feed(content)
  }

  closeModel(perserveState = false){
    if(!perserveState){
      return this.__wrapperDialog.clear()
    }
    return this.__wrapperDialog.el.dataset.state = _a.closed
  }

}

___window_transfer_box.initClass();

module.exports = ___window_transfer_box

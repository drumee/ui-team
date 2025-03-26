const DIALOG = 'dialogHandler';

class __inbound_sharer extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._showMessage = this._showMessage.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onServerComplain = this.onServerComplain.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName ="inbound_sharer";
    this.prototype.behaviorSet =
      {bhv_socket   : 1};
  }

// ===========================================================
// initialize
// ===========================================================
  initialize() {
    super.initialize();
    this.declareHandlers();
    const m = this.model;
    this.model.set({ 
      flow : _a.x});
    this.name  = m.get(_a.fullname);
    this.hub   = m.get(_a.hub);
    this.id    = m.get(_a.id);
    this.email = m.get(_a.email);
    this.phone = m.get(_a.mobile);
    this.media = m.get(_a.media);
    if (this.email === "*") {
      this.name = LOCALE.OPEN_LINK;
      this.url = Visitor.avatar();
    } else {
      this.name = `${m.get(_a.firstname)} ${m.get(_a.lastname)}`;
      this.url = Visitor.avatar(m);
    }
    if (this.media) {
      return this.mset({
        hub_id     : this.media.mget(_a.hub_id),
        nid        : this.media.mget(_a.nodeId),
        share_id   : this.media.mget(_a.share_id)
      });
    }
  }

// ===========================================================
// onDomRefresh
// ===========================================================
  onDomRefresh() {
    const d = this.mget(DIALOG);
    if (d != null) {
      this.dialogWrapper = d.dialogWrapper;
    }
    return this.feed(require("./skeleton/main")(this));
  }
      
// ===========================================================
// 
// ===========================================================
  _showMessage(cmd) {
    this.dialogWrapper.feed(Skeletons.Note({
      content : cmd.model.get(_a.message),
      className : `${this.fig.family}__message`
    })
    );
    const msg = this.dialogWrapper.children.first();
    const doff = this.dialogWrapper.$el.offset();
    const coff = cmd.$el.offset();
    msg.$el.fadeIn();
    return msg.$el.css({ 
      left : coff.left - (this.$el.width()/2),
      top  : (coff.top - doff.top) + this.$el.height()
    });
  }


// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "options-content":
        return this._options = child;
    }
  }


// ===========================================================
// onUiEvent
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.mget(_a.service);
    switch (service) {
      case "show-inbound-msg":
        return this._showMessage(cmd);

      case "hide-inbound-msg":
        this.debug("hide-inbound-msg", this.model);
        return this.dialogWrapper.$el.fadeOut();

      case "accept_notification":
        return this.postService({
          service : SERVICE.sharebox.accept_notification,
          hub_id  : this.model.get(_a.hub_id) || Visitor.id,
          nid     : cmd.model.get(_a.value).nid
        });

      case "refuse_notification":
        return this.postService({
          service : SERVICE.sharebox.refuse_notification,
          hub_id  : this.model.get(_a.hub_id) ||  Visitor.id,
          nid     : cmd.model.get(_a.value).nid
        });
    }
  }
        
// ===========================================================
//
// ===========================================================
  onServerComplain(xhr, socket) {
    return this.warn("TO BE DONE : handler erros !!!");
  }

// ===========================================================
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    //@debug " QQQQQQQQQ 110", data, socket 
    switch (method) {
      case SERVICE.sharebox.accept_notification:
        this.suppress();
        this.service = "accept_notification";
        data.kind = 'media';
        data.nid = data.parent_id;
        data.filetype = _a.folder;
        this.source = new Marionette.View(data);
        return this.triggerHandlers();

      case SERVICE.sharebox.refuse_notification:
        this.softDestroy();
        return this.suppress();
    }
  }
}
__inbound_sharer.initClass();


module.exports = __inbound_sharer;

// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/builtins/editor/json/ui
//   TYPE :
// ==================================================================== *

//-------------------------------------
//
//
//-------------------------------------
class __editor_json extends LetcBox {

  initialize() {
    super.initialize(opt);
    this.initHandlers();
    this.skeleton = require('./skeleton');
    this.source = opt.source;
  }


  // ===========================================================
  // setupInteract
  //
  // @param [Object] e
  // @param [Object] total
  //
  // ===========================================================
  setupInteract() {
    this.$el.draggable({
      start: this._dragStart,
      stop: this._dragStop,
      handle: `.${this.fig.family}__handle`
    });
    this.$el.resizable({
      start: this._resizeStart,
      stop: this._resizeStop,
      resize: this._resize,
      aspectRatio: false,
      scroll: true,
      handles: "all"
    });

  }

  // ======================================================
  //
  // ======================================================
  _start() {
    //$el = @_content.el[0]
  }

  // ===========================================================
  //
  // ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "ref-content":
        this._editor = new JSONEditor(child.el, {
          onChange: this._onChange,
          onModeChange: this._onModeChange
        });
        this._editor.set(this.source);
        break;

      case "ref-handle":
        this.waitElement(child.el, this.setupInteract.bind(this));
        break;
    }
  }

  // ===========================================================
  // _onChange
  //
  // @param [Object] a
  //
  // ===========================================================
  _onChange(a) {
    this.debug("_onChange : TBD", a);
    return this.changed = true;
  }

  // ===========================================================
  // getData
  //
  // @param [Object] a
  //
  // ===========================================================
  getData(a) {
    return this._editor.get();
  }


  /**
   * 
   * @param {*} a 
   */
  _onModeChange(a) { }

  /**
   * 
   * @param {*} btn 
   * @returns 
   */
  onUiEvent(btn) {
    const service = btn.get(_a.service) || btn.get(_a.name);
    const signal = this.get(_a.signal);
    switch (service) {
      case _e.cancel:
        this.canceled = 1;
        //Panel.clearPart(_a.context)
        return this.suppress();

      case _a.validate:
        return this._src = this._src.parent.replace(this._src, this._editor.get());

      case _e.preview:
        if (btn.get(_a.state)) {
          this._src.model.set(this._editor.get());
          if (_.isFunction(this._src.refresh)) {
            this._src.refresh();
          }
          return Panel.getPart(_a.context).$el.attr('data-layer', "x-ray");
        } else {
          return Panel.getPart(_a.context).$el.attr('data-layer', _a.none);
        }
    }
  }
}
module.exports = __editor_json;

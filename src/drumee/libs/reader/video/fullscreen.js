const Cls = (Reader.Fullscreen = class Fullscreen extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
    this.prototype.templateName = "#fullscreen";
    this.prototype.className = "viewer cursor-pointer";
    this.prototype.regions =
      {contentRegion : _REGION.content};
    this.prototype.ui  =
      {close  : '.xui-close'};
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh(){
    this.options.callback = () => {
      return location.hash = _K.string.empty;
    };
    const layout = this.getOption(_a.layout);
    const view   = new Container(layout);
    return this.contentRegion.show(view);
  }
});
Cls.initClass();

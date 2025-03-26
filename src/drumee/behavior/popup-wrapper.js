class __bhv_popup_wrapper extends Marionette.Behavior {

  onDomRefresh() {
    let top;
    let max = 700;
    if (__guard__(this.view.get(_a.styleOpt), x => x[_a.maxWidth]) != null) {
      max = this.view.get(_a.styleOpt)[_a.maxWidth];
    }
    const maxWidth = Math.min(window.innerWidth, max);
    this.$el.css(_a.width, maxWidth.px());
    const left = parseInt((window.innerWidth/2) - (maxWidth/2));
    if (Visitor.isMobile()) {
      top = 0;
    } else {
      top = ((parseInt(window.innerHeight) - this.$el.height())/3) + window.scrollY;
    }
    return this.$el.css({
      position : _a.absolute,
      top,
      left
    });
  }
}
module.exports = __bhv_popup_wrapper;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

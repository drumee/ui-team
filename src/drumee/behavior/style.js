class __exported__ extends Marionette.Behavior {
  onRender() {
    const styleOpt = this.view.get(_a.styleOpt);
    if (styleOpt != null) {
      this.$el.css(styleOpt);
    }
    if (this.view._anim_data != null) {
      const anim = this.view.get(_a.anim);
      if (anim != null) {
        let str = '';
        for (var k in anim) {
          var v = anim[k];
          str = `${str}${k}: ${v}; `;
        }
        return this.$el.attr(this.view._anim_data, str);
      }
    }
  }
}
module.exports = __exported__;

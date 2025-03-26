class __bhv_fig extends Marionette.Behavior {

  initialize(opt) {
    //@debug "zzzzzz 15", opt
    if (this.view.figName) {
      return this.name = this.view.figName;
    } else if (opt != null ? opt.name : undefined) {
      return this.name = opt.name;
    } else { 
      this.warn(this.view, WARNING.attribute.recommanded.format(_a.name));
      return this.name = this.view.constructor.name;
    }
  }

  onBeforeRender(opt) {
    const family = this.name.replace(/^(_+)/, '').replace(/_/g, '-');
    const f = family.split(/-/);
    const group = f.shift();
    const name  = family.replace(group, '').replace(/^-+/, '');
    this.view.fig = {
      group, //f[0] # + '-group'
      family,
      name //f[1]
    };
    if (_.isObject(this.view.mget(_a.fig))) {
      return _.merge(this.view.fig, this.view.mget(_a.fig));
    }
  }
    // if @view.mget(_a.figPrefix)
    //   @view.fig.prefix = @view.mget(_a.figPrefix)


// ===========================================================
//
// ===========================================================
  onDomRefresh() {
    const b = this.view.fig;
    return this.$el.addClass(`${b.group} ${b.family} ${b.group}__item ${b.group}__ui ${b.family}__ui`);
  }
}

module.exports = __bhv_fig;

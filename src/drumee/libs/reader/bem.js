class __fig extends LetcBox {


  initialize(opt) {
    super.initialize(opt);
    const family    = this.constructor.name.replace(/^(_+)/, '').replace(/_/g, '-');
    const f = family.split('-');
    this.fig = {
      group  : f[0],
      family,
      name   : f[1]
    };
    if (_.isObject(this.mget(_a.fig))) {
      _.merge(this.fig, this.mget(_a.fig));
    }
    if (this.mget(_a.figPrefix)) {
      return this.fig.prefix = this.mget(_a.figPrefix);
    }
  }


// ===========================================================
//
// ===========================================================
  onDomRefresh() {
    this.$el.addClass(`${this.fig.group} ${this.fig.group}__ui ${this.fig.family}__ui`);
    super.onDomRefresh();
  }
}

module.exports = __fig;

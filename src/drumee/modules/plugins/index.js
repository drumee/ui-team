

class __module_plugins extends LetcBox {
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.mset({ flow: _a.y })
  }


  /**
   * 
   */
  route() {
    let opt = Visitor.parseModuleArgs();
    let { name, kind, title } = opt;
    this.feed(require("./skeleton").default(this, title || name))
    Kind.loadPlugin({ name, kind }).then(async (p) => {
      await Kind.waitFor(kind)
      this.feed({ ...opt, kind })
      const event = new Event('drumee:plugins:ready');
      document.dispatchEvent(event);
    }).catch((e) => {
      console.error("Failed to load PLUGIN-hub.", e)
    })
  }

  /**
   * 
   */
  onDomRefresh() {
    this.route();
  }
}
module.exports = __module_plugins;


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
  }


  /**
   * 
   */
  route() {
    let { name, kind } = Visitor.parseModuleArgs();
    this.debug(`Loading plugin name=${name} to be used as kind=${kind}`)
    Kind.loadPlugin({ name, kind }).then(async (p) => {
      this.debug("PLUGIN LOADED", p)
      let plugin = await Kind.waitFor(kind)
      this.debug("PLUGIN", plugin)
      this.feed({ kind })
      const event = new Event('drumee:plugins:ready');
      this.debug("Plugins router loaded")
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
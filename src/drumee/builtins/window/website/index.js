const __hub = require('../hub');
class __window_website extends __hub {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize(opt);

    this.style.set({
      width: this.size.width,
      height: this.size.height
    });

    if (Visitor.device() === _a.desktop) {
      this.style.atLeast({
        top: 90,
        left: (window.innerWidth / 2) - (this.size.width / 2)
      });
    }

    this.isHub = 1;
    this.settingsLabel = LOCALE.WEBSITE_SETTINGS;
    this.defaultSkeleton = require("./skeleton/main");
    require('./skin');
  }

}


module.exports = __window_website;

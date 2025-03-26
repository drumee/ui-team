const __core = require('player/interact');

class __player_vector extends __core {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('../skin');
    require('./skin');
    this.isPlayer = 1;
    super.initialize(opt);
    this.declareHandlers();
    this.info = null;
    this.information = require('../skeleton/file-info');
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    this.debug("AAA:35", pn);
    switch (pn) {
      case _a.content:
        child.on(_e.show, () => {
          this.start();
        });

        break;
      default:
        super.onPartReady(child, pn);
    }
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.media.wait(0);
    this.restart();
  }

  /**
   * 
   */
  async restart() {
    this.raise();
    const { nid, hub_id, url } = this.actualNode();
    const opt = {
      service: SERVICE.media.info,
      nid,
      hub_id,
    };

    let data = await this.fetchService(opt, { async: 1 });
    if (this.parseInfo(data)) {
      let blob = await this.fetchFile({ url });
      if (!blob || blob.error) {
        return this.failedToStart(blob);
      }
      let r = await blob.text();
      this.contentText = r;
      this.feed(require('../skeleton/main')(this));
    }
  }

  /**
   * 
   */
  start() {
    this.__content.el.innerHTML = this.contentText;
    this.__content.el.childNodes.forEach(node => {
      if (node.style) {
        node.style.width = _K.size.full;
        node.style.height = _K.size.full;
      }
    });
    this.display({
      width: this.$el.width(),
      height: this.__content.$el.height() + 20
    }, () => {
      this.$el.css({
        height: _a.auto,
        minHeight: this.__content.$el.height(),
        minWidth: this.__content.$el.width()
      });
    });
  }
}

module.exports = __player_vector;


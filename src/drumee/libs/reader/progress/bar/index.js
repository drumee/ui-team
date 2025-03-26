const { filesize } = require("core/utils")

class ___progress_bar extends LetcBox {



  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers({ part: _a.multiple });
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'percent':
        let id = `${child._id}-inner`;
        this.waitElement(id, () => {
          this.__bar = document.getElementById(id);
        })
        break;
    }
  }

  /**
   * 
   */
  update(opt) {
    if (!opt) return;
    let p, v;
    if (_.isObject(opt)) {
      p = 100 * opt.loaded / opt.total;
      v = Math.ceil(p)
    } else {
      if (_.isNumber(opt))
        v = Math.ceil(opt)
      else
        v = parseInt(opt)
    }

    if (this.__bar == null) return;
    this.__bar.style.width = `${v}%`;

    if (opt.loaded != null) {
      this.__loaded.set(_a.content, filesize(opt.loaded))
    }
    if (opt.total != null) {
      this.__total.set(_a.content, filesize(opt.total))
    } else {
      this.__total.set(_a.content, this.__bar.style.width);
    }
    return;
  }

  /**
   * 
   */
  setLabel(l) {
    this.__label.set(_a.content, l)
  }

  /**
   * 
   */
  restart(total = "", delay = 1000) {
    if (!this.__bar) return;
    this.__bar.style.display = _a.none;
    this.__total.set(_a.content, filesize(total));
    _.delay(() => {
      this.__bar.style.width = 0;
      this.__bar.style.display = 'flex';
    }, delay);
  }


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }



}

module.exports = ___progress_bar


const __window_interact = require('window/interact');
class __window_chatInteract extends __window_interact {
  constructor(...args) {
    super(...args);
    this.resetShift = this.resetShift.bind(this);
    this.seek_insertion = this.seek_insertion.bind(this);
  }

  static initClass() {
    this.prototype.isChatWindow = 1;
  }

  /**
   * 
   * @param {*} media 
   * @returns 
   */
  insertMedia(media) {
    return Kind.waitFor('widget_chat').then(() => {
      const a = this.getItemsByKind('widget_chat')[0];
      if (_.isEmpty(a) || a.isDestroyed()) {
        return;
      }
      return a.insertMedia(media);
    });
  }

  /**
   * 
   * @param {*} e 
   * @param {*} token 
   */
  load(e, token) { }
  // do not remove

  /**
   * 
   * @param {*} moving 
   */
  resetShift(moving) { }
  // window.manager overload  # Do not remove 

  /**
   * 
   * @param {*} moving 
   * @returns 
   */
  seek_insertion(moving) {
    this.captured = {};
    return this;
  }

  /**
   * 
   * @param {*} ui 
   * @param {*} action 
   * @returns 
   */
  responsive(ui, action) {
    let newSize, width;
    if ((this.el == null)) {
      return;
    }
    const oldSize = this.el.dataset.size;
    if ((ui == null)) {
      width = this.$el.width();
    } else if (ui.width) {
      ({
        width
      } = ui);
    } else {
      width = this.$el.width();
    }
    const v = this.getBranch('max-view');

    if (width < 600) {
      newSize = _a.min;
    } else if (width < 950) {
      newSize = _a.medium;
    } else {
      newSize = _a.max;
    }
    this.el.dataset.size = newSize;
    if (newSize !== oldSize) {
      this.changeWindowSize(newSize, oldSize);
    }

    this._view = newSize;
    // v.el.dataset.action = action
    this.el.dataset.action = action;
    return this.updateInstance();
  }

  /**
   * do not remove
   * @returns 
   */
  _dragStop() {
    return this.syncBounds();
  }

  /**
   * 
   */
  fileDragEnter() { }
}
__window_chatInteract.initClass();

module.exports = __window_chatInteract;

/**
 * 
 */
const CHANGE_RADIO = 'change:radio';

class __hub_core extends LetcBox {


  /**
   * 
   * @param {*} opt 
   */
  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize();
    if (this.mget(_a.authority) & (_K.permission.owner | _K.permission.admin)) {
      this.editable = 1;
    } else {
      this.editable = 0;
    }
    this.declareHandlers();
  }


  /**
   * 
   */
  /**
   * 
   */
  onRender() {
    super.onRender();
    this.el.dataset.edit = 0;
    this.model.on(_e.change, m => {
      if (this._isShown && (m.changed.state === 0)) {
        this.dialogWrapper.clear();
      }
    });
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "wrapper-dialog":
        this.dialogWrapper = child;
        return child.onChildDestroy = c => {
          if (child.isEmpty()) {
            this.el.dataset.edit = 0;
          }
        };
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args) {
    if (!pointerDragged) {
      this.triggerMethod(CHANGE_RADIO, this);
    }
  }

}

module.exports = __hub_core;

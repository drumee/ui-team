
/**
 * Class representing core in Welcome module.
 * @class ___welcome_core
 * @extends LetcBox
 */

class __welcome_core extends LetcBox {


  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._buttonLabel = 'Go';
    return this._letters = {};
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case 'ref-go': case 'ref-button': case 'button-wrapper':
        return this._button =  child;

      case 'ref-message':
        return this._message =  child;

      case 'ref-email': case 'ref-password': case 'ref-entry': case 'ref-ident':
        this._input =  child;
        child.on(_e.keyup, ()=> {
          return this.checkSanity();
        });
        return child.on(_e.blur, ()=> {
          return this.clearMessage();
        });
    }
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);

    switch (service) {
      case 'show-password':
        var pw = this._input;
        if (cmd.mget(_a.state)) {
          pw.mset(_a.type, _a.password);
        } else { 
          pw.mset(_a.type, _a.text);
        }
        return pw.reload();
      
      default: 
        return this.clearMessage();
    }
  }

  /**
   *
  */
  clearMessage () {
    const e = this.__errorMessage; 
    const b = this._button;

    if (e) {
      e.el.dataset.error = 0;
      e.el.dataset.state = 1;
    }

    if (b) {
      b.el.dataset.error = 0;
      b.el.dataset.state = 1;
    }

    try {
      return this._message.clear();
    } catch (error) {}
  }

  /**
   * @param {String} txt
   * @param {any} state
  */
  msg (txt, state) {
    const b = this.__errorMessage || this._button;
    b.el.dataset.error = state;
    b.el.dataset.state = state^1;
    if (b.set) {
      return b.set(_a.content, txt);
    }
  }

  /**
   *
  */
  checkSanity () {
    if (!this._input.checkSanity()) {
      this._input.showError();
      this.msg(this.subtitle);
      return true;
    }

    return false; 
  }

  /**
   *
  */
  goodbye () {
    return this.softDestroy(null, null, function(){
      const h = Backbone.history;
      if (h.history.length > 1) {
        return h.history.back();
      } else { 
        return h.navigate(_K.module.desk);
      }
    });
  }

  /**
   *
  */
  onServerComplain(xhr) {
    try { 
      const err = xhr.error || xhr.responseJSON.message;
      return this.msg(err, _a.error);
    } catch (error) { 
      this.debug('unknown error', xhr);
      return this.msg('unknown error', _a.error);
    }
  }
}


module.exports = __welcome_core;

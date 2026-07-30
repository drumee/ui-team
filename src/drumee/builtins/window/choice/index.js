
mfsInteract = require('../interact')
require('./skin');
class ___window_choice extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    this.model.atLeast({
      maxsize: 0
    });
    this.contextmenuSkeleton = _a.none;
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'topbar':
      case _a.content:
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
   */
  onBeforeRender() {
    this.el.dataset.state = _a.closed;
    this.el.dataset.type = "confirm";
    this.el.dataset.maxsize = this.mget('maxsize');
  }
  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    this._choice = cmd;
    return this.trigger(service, args)
  }

  /**
   * 
   * @param {*} content 
   * @returns 
   */
  ask(message, questions) {
    this.el.dataset.state = _a.open;
    this._questions = questions;
    this.feed(require('./skeleton')(this, message, questions));
    const a = new Promise((resolve, reject) => {
      this.once(_a.selection, (a, b) => {
        // The buttons come from the shared button() toolkit (see
        // skeleton/footer.js), which forwards `value` but not an arbitrary
        // `choice` field — so the 1-based index rides on `value`. `choice` stays
        // as a fallback for any caller feeding its own button skeletons, and the
        // label is read back off the questions list rather than the widget,
        // whose text lives on an inner span.
        const m = this._choice.model.toJSON();
        const choice = Number(m.choice != null ? m.choice : m.value) || 0;
        const content = (this._questions || [])[choice - 1];
        resolve({ choice, content })
        this.goodbye()
      })
      this.once(_a.close, (a, b) => {
        this.goodbye()
        resolve({ choice: 0, content: _a.close })
      })
    });
    return a;
  }

}


module.exports = ___window_choice;
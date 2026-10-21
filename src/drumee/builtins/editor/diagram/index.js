const __player = require("player/interact");

class __editor_diagram extends __player {
  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.size.with = window.innerWidth - 100;
    this.style.set({ width: this.size.with });
  }

  /**
   * 
   */
  display(){
    this.size = this.max_size();
    super.display(this.size);
  }

  /**
   *
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        this.display({ top: 85 });
        this.setupInteract();
        this.raise();
        let media = this.media;
        let kind = 'diagram_state';
        Kind.waitFor(kind).then(()=>{
          child.feed({ kind, media });
          this._diagram = child.children.last();  
        })

        break;
      default:
        super.onPartReady(child, pn);
    }
  }


  //window.addEventListener('DOMContentLoaded', init);

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * Save the diagram before the window goes away (the Open-File Switcher
   * closes this editor to show the next file); it is otherwise only saved
   * on the floppy icon. Resolves true once nothing is left to save, false
   * when the save did not go through so the caller keeps the window open.
   */
  async saveBeforeClose() {
    const st = this._diagram;
    if (!st || !st._diagram || !st._diagram.isModified) return true;
    await st.save();
    return !st._diagram.isModified;
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.save:
        this._diagram.save();
        break;
      case _e.load:
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   * @param {Object} xhr
   * @param {Model} socket
   */
  on_rest_error(xhr, socket) {
    this.warn(`EEE:70 GOT SERVER ERROR :`, xhr);
  }


}

export default __editor_diagram;

/* ============================================================= *
*   Copyright xialia.com  2011-2021
* ============================================================== */

const { xhRequest } = require("core/socket/request");

const __player = require('player/interact');
const REMINDER_ID = 'reminder_id';

class __player_text extends __player {
  /**
   * 
   */
  async initialize(opt = {}) {
    this.size = _K.docViewer;
    super.initialize(opt);
    require('../skin');
    require('./skin');
    if (opt.maiden) { // Maiden note
      delete opt.maiden;
      this.model.unset('maiden')
      this.mset(({ content: '' }));
      let w = Wm.getActiveWindow();
      this.mset({
        hub_id: Visitor.id,
        pid: w.getCurrentNid(),
        filename: LOCALE.NOTE,
        ext: 'txt',
        filetype: _a.note
      });
    }

    this.style.set({ ...this.size, minWidth: 200, minHeight: 200 });
    this.isEditor = 1;
    this.isPlayer = 1;
  }


  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case _a.content:
        this.display({ top: 85 });
        this.setupInteract();
        let tags = _K.allowed_tag;
        tags.push(_K.tag.img);
        child.feed(Skeletons.Element({
          tagName: 'textarea',
          sys_pn: 'text-content',
          name: _a.content,
          tags,
          className: `${this.fig.family}__text-content`,
          attribute: {
            type: _a.text
          }
        }))
        break;
      case 'text-content':
        this.waitElement(child.el, () => {
          child.el.value = this.mget(_a.content);
        })
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */

  onDomRefresh() {
    this.raise();
    let url = null;
    if (this.media) {
      url = this.media.actualNode().url;
    } else if (this.mget(REMINDER_ID)) {
      url = this.actualNode().url + `&v=${Dayjs().valueOf()}`;
    }
    if (url) {
      xhRequest(url, { responseType: _a.text }).then(async (data) => {
        this.mset(({ content: data }));
        if (this.media && this.media.wait) this.media.wait(0);
        this.feed(require('./skeleton')(this));
      }).catch((e) => {
        this.suppress();
        this.warn("Failed to load", url, e);
        let msg = e.reason || e.error || LOCALE.INTERNAL_ERROR;
        Wm.alert(msg);
      })
      return;
    }
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.close:
        this.goodbye();
      default:
        this.debug("AAA:80");
        super.onUiEvent(cmd, args)
    }
  }


}
module.exports = __player_text;

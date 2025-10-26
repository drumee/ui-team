const { colorFromName } = require("core/utils")

const __cache = {};
class __user_profile extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.model.atLeast({
      flow: _a.y
    });
    this.declareHandlers();
    let id = opt.id || opt.uid || opt.user_id || opt.drumate_id || opt.entity_id;
    this.mset({ id });
    if (window.Wm) {
      Wm.on('user.connection_status', this.updateStatus.bind(this));
    }
  }


  /**
   * 
   */
  onBeforeDestroy() {
    if (window.Wm) {
      Wm.off('user.connection_status', this.updateStatus.bind(this));
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this.loadImage();
    if (window.Wm) {
      let data = Wm.getContactStatus(this.mget(_a.id));
      if (!data) return;
      this.mset(_a.online, data.status);
    }
    this.el.dataset.online = this.mget(_a.online);
  }

  /**
   * 
   * @param {*} m 
   * @returns 
   */
  _show(m) {
    if (m === 'p') {
      const imageType = this.mget(_a.type) || _a.vignette
      const src = Visitor.avatar(this.mget(_a.id), imageType);

      return this.__imageBox.feed({
        kind: KIND.image.smart,
        className: `${this.fig.family}__icon ${this.fig.family}__picture picture`,
        sys_pn: 'picture',
        src,
        active: this.mget(_a.active)
      });
    }

    let opt = null;
    let initiales = this.initiales();
    if (this.mget('auto_color') != 0) {
      let bgColor = colorFromName((initiales || '??'));
      if (this.mget('oneLetter')) {
        bgColor = colorFromName((this.mget(_a.firstname) || '??'));
      }

      opt = {
        backgroundColor: bgColor
      }
    }
    if (initiales) {
      return this.__imageBox.feed(Skeletons.Note({
        content: initiales,
        className: `${this.fig.family}__icon ${this.fig.family}__initiales`,
        sys_pn: 'initiales',
        active: this.mget(_a.active),
        style: opt
      }));
    }
    this.__imageBox.feed(Skeletons.Button.Svg({
      ico: "desktop_account--white",
      className: `${this.fig.family}__icon ${this.fig.family}__initiales`,
      sys_pn: 'initiales',
      active: this.mget(_a.active),
      style: opt
    }));
  }


  /**
   * 
   */
  initiales() {
    let firstname, lastname;
    try {
      firstname = this.mget(_a.firstname)[0] || '?';
    } catch (error) {
      firstname = '';
    }
    try {
      lastname = this.mget(_a.lastname)[0] || firstname[0] || "";
    } catch (error1) {
      lastname = '';
    }

    if ((firstname.length + lastname.length) === 0) {
      let a, b;
      try {
        [a, b] = this.mget(_a.surname).split(/ /);
        firstname = a[0];
        lastname = b[0];
      } catch (error2) {
        firstname = '';
      }
    }

    return firstname + lastname;
  }

  /**
   * 
   */
  displayName() {
    if (!_.isEmpty(this.mget(_a.surname))) return this.mget(_a.surname);
    if (!_.isEmpty(this.mget(_a.username))) {
      let [firstname, lastname] = this.mget(_a.username).split(/[ ,]+/);
      this.mset({ firstname, lastname });
      return this.mget(_a.username);
    }
    let first = this.mget(_a.firstname);
    let last = this.mget(_a.lastname);
    let email = this.mget(_a.email).split('@')[0];
    if (_.isEmpty(first)) {
      return (last || email);
    }
    if (_.isEmpty(last)) {
      return (first || email);
    }
    return `${first} ${last}`;
  }

  /**
   * 
   */
  loadImage() {
    // Optimization : prevent reload when marked as error 
    if (__cache[this.mget(_a.id)]) {
      this.el.dataset.default = 1;
      this._show('i');
      return;
    }

    const img = new Image();
    img.onerror = this._onError.bind(this);

    img.onload = e => {
      this.el.dataset.quality = _a.high;
      this.el.dataset.default = 0;
      this._loaded = true;
      this._show('p');
    };

    const imageType = this.mget(_a.type) || _a.vignette
    img.src = Visitor.avatar(this.mget(_a.id), imageType);
  }

  /**
   * 
   * @param {*} e 
   */
  _onError(e) {
    __cache[this.mget(_a.id)] = 1;
    this.el.dataset.default = 1;
    return this._show('i');
  }


  /**
* 
* @param {*} service 
* @param {*} data 
*/
  updateStatus(data) {
    if (data.user_id != this.mget(_a.id)) return;
    this.el.dataset.online = data.status;
    this.mset({ online: data.status })
    this.trigger('status_changed', data);
  }

}


module.exports = __user_profile;

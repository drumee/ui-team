
const DISK_USAGE = 'disk_usage';
const DATEFORMAT = {
  en: "MM/DD/YYYY",
  es: "DD/MM/YYYY",
  fr: "DD/MM/YYYY",
  km: "DD/MM/YYYY",
  ru: "DD.MM.YYYY",
  zh: "YYYY/MM/DD",
}
let defaultQuota;
const { timestamp, randomString } = require("core/utils")

//########################################
class __core_user extends Backbone.Model {

  /**
   * 
   */
  initialize(o) {
    this.set(bootstrap());
    let p = this.profile();
    if (_.isString(p.privacy)) {
      p.privacy = JSON.parse(p.privacy);
      this.set({
        privacy: p.privacy
      });
    }
    if (_.isString(p.location)) {
      p.location = JSON.parse(p.location);
      this.set({
        location: p.location
      });
    }

    const urlModules = this.parseModule()
    // for dmz sharebox
    this.inDmz = urlModules.includes(_a.dmz);
    this.dmzToken = urlModules[2]
    this.dmzRecipientToken = urlModules[3]

  }

  /**
   * 
   */
  listenChanges() {
    let p = this.profile();
    this.on(_e.change, m => {
      if (m.changed) {
        this.respawn(m.changed);
        if (m.changed.user) {
          let pr = { ...this.profile(), ...m.changed.user };
          delete pr.profile;
          this.set(_a.profile, pr);
        }
      }
      if (this.get(_a.hub_id) != this.id) {
        this.set({ hub_id: this.id })
      }
      p = this.profile() || {};
      if (_.isString(p.location)) {
        try {
          return p.location = JSON.parse(p.location);
        } catch (error) { }
      }
    });

    RADIO_MEDIA.on(_e.uploaded, (data) => {
      if (!data || !data.filesize) return;
      let { filesize } = data;
      let total = this.diskUsed() + parseInt(filesize)
      let disk_usage = { ...this.get('disk_usage'), total }
      this.set({ disk_usage })
    })

    RADIO_MEDIA.on(_a.free, (data) => {
      this.debug("AAAA:71", data)
      if (!data || !data.disk_usage) return;
      let { disk_usage } = data;
      this.set({ disk_usage })
    })
  }


  /**
   * 
   */
  language() {
    let l = localStorage.lang;
    try {
      l = this.profile().lang;
    } catch (error) {
      l = this.get(_a.lang);
    }
    if ((l == null)) {
      l = navigator.language.split('-');
      l = l[0] || '';
    }
    switch (l.toLowerCase()) {
      case 'en': case 'fr': case 'km': case 'ru': case 'zh':
        l = l;
        break;
      default:
        l = 'en';
    }
    return l;
  }

  /**
   * 
   */
  browserSupport() {
    let browser = require('detect-browser').detect();
    let [major, minor, rel] = browser.version.split(/\.+/);
    major = parseInt(major);
    minor = parseInt(minor);
    switch (browser.name) {
      case 'chrome':
      // return major >= 62;
      case 'edge-chromium':
      // return major >= 79;
      case 'firefox':
      // return major >= 90;
      case 'safari':
      // return major >= 14;
      case 'yandexbrowser':
      // return major >= 62;
      case 'opera':
      // return major >= 76;
      case 'samsung-internet':
        // return major >= 14;
        return ((major + minor / 10) >= this.canUseBrowser(browser.name))
    }

    return false
  }

  /**
   * 
   * @returns 
   */

  canUseBrowser(name) {
    let a = {
      'chrome': 62,
      'edge-chromium': 79,
      'firefox': 90,
      'opera': 76,
      'qq-browser': 10.4,
      'safari': 14.1,
      'samsung-internet': 14,
      'yandexbrowser': 21,
    }
    return a[name];
  }

  /**
   * 
   * @returns 
   */

  canUseVisio() {
    return this.profile().category != 'trial';
  }

  /**
   * 
   */
  firstname(v) {
    if (v) {
      let user = this.get(_a.user) || {};
      user.firstname = v;
      this.set({ user })
    }
    let p = this.profile();
    return p.firstname || this.get(_a.firstname) || '';
  }


  /**
   * 
   */
  lastname(v) {
    let l;
    if (v) {
      let user = this.get(_a.user) || {};
      user.lastname = v;
      this.set({ user })
    }
    let p = this.profile();
    return p.lastname || this.get(_a.lastname) || '';
  }

  /**
   * 
   */
  fullname() {
    let p = this.profile();
    if (p.fullname) return p.fullname;
    if (_.isEmpty(p.firstname + p.lastname)) {
      return p.email;
    }
    let f = (p.firstname || '') + ' ' + (p.lastname || '');
    return f.trim();
  }


  /**
   * 
   */
  data(attr) {
    let l;
    try {
      l = this.profile()[attr] || {};
    } catch (error) {
      l = {};
    }
    return l;
  }


  /**
   * 
   */
  timeout(t) {
    if (t == null) { t = 2000; }
    return ~~this.parseModuleArgs().timeout || t;
  }

  /**
   * 
   */
  pagelang(l) {
    const o = Visitor.parseLocation();
    l = o.lang || o.language || o.pagelang || localStorage.pagelang || bootstrap().lang || localStorage.getItem('UIlanguage');
    if ((l == null)) {
      l = navigator.language.split('-');
    }
    if (_.isString(l) && !_.isEmpty(l)) {
      return l;
    }
    return l[0] || 'en';
  }

  /**
   * 
   */
  setPagelang(l) {
    localStorage.pagelang = l;
    this.set({
      pagelang: l
    });
    return l;
  }


  /**
   * 
   */
  respawn(data) {
    if (_.isEmpty(data)) return;
    if (data.connection == _a.online) this.set({ signed_in: 1 });
    if (data.connection == 'offline') this.set({ signed_in: 0 });
    if (data.signed_in == 0) {
      this.set({ connection: 'offline' });
      this.trigger('offline');
    }
    if (data.signed_in == 1) {
      this.set({ connection: _a.online });
      this.trigger('online');
      if (document.head.dataset.preserveTitle == null) {
        document.title = `${this.fullname()}@${Organization.name()}`;
      }
    }
    if (/^[0,1]$/.test(data.signed_in)) this.set({ signed_in: data.signed_in });
    for (let k of [_a.profile, _a.settings, _a.quota, 'disk_usage']) {
      if (!data[k]) continue;
      if (_.isString(data[k])) {
        this.set(k, JSON.parse(data[k]));
      } else if (_.isObject(data[k])) {
        this.set(k, { ...data[k] });
      }
    }
    let quota = { ...Visitor.quota() }
    if (quota) {
      for (let k in quota) {
        if (k != _a.category) {
          quota[k] = parseInt(quota[k])
        }
      }
      defaultQuota = quota;
      this.set({ quota })
    }
    localStorage.setItem('UIlanguage', this.language());
    if (data.connection && data.connection == 'offline') {
      this.set({ signed_in: 0 });
      if (this._previousAttributes.connection != _a.online) return;
      this.trigger("gone:offline");
    }
  }

  /**
   * Return disk free 
   */
  diskFree() {
    let storage = this.quota("storage") || {};
    if (defaultQuota == null) {
      return Infinity;
    }
    let free = storage - this.diskUsed();
    return free;
  }

  /**
   * Return disk free 
   */
  diskUsage() {
    return this.get('disk_usage')
  }

  /**
 * Update current disk usage
 */
  diskUsed(size) {
    let { total } = this.get('disk_usage') || {};
    return total || 0;
  }


  /**
   * 
   */
  changePageLang(l) {
    localStorage.pagelang = l;
    this.set({
      pagelang: l
    });
    localStorage.setItem('UIlanguage', l);
    location.reload();
    return l;
  }

  /**
   * 
   */
  settings() {
    const a = this.get(_a.settings) || {};
    if (_.isString(a)) {
      try {
        this.set(_a.settings, JSON.parse(a));
        return this.get(_a.settings);
      } catch (e) {
      }
    }
    return a;
  }

  /**
   * 
   */
  profile() {
    let p = this.get(_a.profile);
    if (_.isString(p)) {
      try {
        p = JSON.parse(p)
      } catch (e) {
        p = {};
      }
    }
    return { ...p, ...this.get(_a.user) };
  }

  /**
   * 
   */
  quota(name) {
    let q = this.get(_a.quota);
    if (!q) {
      let { storage } = this.get(_a.quota) || {};
      q = { storage: storage || Infinity };
    }
    if (!name) return q || {};
    return q[name] || 0;
  }

  /**
   * 
   */
  wallpaper() {
    if (!this.isOnline()) return null;
    let { nid, hub_id } = this.settings().wallpaper || {};
    if (nid && hub_id) return { nid, hub_id };
    return Organization.deskWallpaper();
  }


  /**
   * 
   */
  dateformat() {
    let { dateformat: v } = this.settings() || {}
    if (!v) {
      v = DATEFORMAT[this.language()] || "DD/MM/YYYY"
    }
    return v;
  }

  /**
   * 
   */
  timeformat() {
    let { timeformat: v } = this.settings() || {};
    if (v) return v;
    let d = this.dateformat()
    return `${d} - HH:mm:ss`
  }

  /**
   * 
   */
  localeTime(t) {
    t = t || timestamp(1);
    Dayjs.unix(t).calendar();
  }


  /**
   * 
   */
  device() {
    const o = this.parseLocation();
    if (o.device) {
      return o.device;
    }
    if (this.get(_a.device) != null) {
      return this.get(_a.device);
    }
    const width = window.innerWidth;
    if (_.compact(navigator.userAgent.match(/mobile/i)).length || (window.innerWidth < 500)) {
      return _a.mobile;
    }
    return _a.desktop;
  }

  /**
   * Drumee Device Id
   */
  deviceId() {
    let id = localStorage.getItem('deviceId');
    if (_.isEmpty(id) || !/^ddi_"/.test(id)) {
      return this.initDeviceId();
    }
    return id;
  }

  /**
   * 
   */
  initDeviceId() {
    let id = this.get(_a.socket_id) || randomString(2);
    id = id.replace(/[\/=\+\-]/g, parseInt(Math.random() * 10).toString());
    id = `ddi_${id}`
    localStorage.setItem('deviceId', id);
    return id;
  }

  /**
   * 
   */
  destroyDeviceId() {
    try {
      let deviceIds = JSON.parse(localStorage.getItem('device_ids'));
      //console.log("DESTROY Device", deviceIds, window.currentTabID, window.currentDeviceID);
      delete deviceIds[window.currentTabID];
      localStorage.setItem('device_ids', JSON.stringify(deviceIds));
    } catch (e) {
      console.log(e, "Device DETROY ERROR")
    }
  }

  /**
   * 
   */
  parseLocation(s) {
    let loc = s || location.search;
    const blocks = loc.replace('?', '').split('&');
    const opt = {};
    for (let b of Array.from(blocks)) {
      const a = b.split('=');
      while (a.length) {
        const k = a.shift();
        let v = a.shift();
        if ((v != null) && !_.isEmpty(k)) {
          v = v.replace(/\/+/, '');
          opt[k] = decodeURI(v);
        }
      }
    }
    return opt;
  }

  /**
   * 
   */
  parseModule(l) {
    let b;
    if (l != null) {
      b = l.split(/[\#\/&\?]/g);
    } else {
      b = location.hash.split(/[\#\/&\?]/g);
    }

    while (b.length && _.isEmpty(b[0])) {
      b.shift();
    }
    return b;
  }

  /**
   * 
   */
  parseModuleArgs(l) {
    let b;
    if (l != null) {
      b = l.split(/[\#\/&\?]/g);
    } else {
      b = location.hash.split(/[\#\/&\?]/g);
    }
    const o = {};
    for (let a of Array.from(b)) {
      const c = a.split(/( *= *)/);
      if (!_.isEmpty(c[0])) {
        o[c[0]] = c[2];
      }
    }
    return o;
  }

  /**
   * 
   */
  isMobile() {
    return this.device() === _a.mobile;
  }

  /**
   * 
   * @returns 
   */
  isOnline() {
    if (this.get(_a.connection) == _a.online) return 1;
    if ((new Date().getTime() - bootstrap().startTime) <= 30) {
      return bootstrap().signed_in
    }
    return 0;
  }

  /**
   * 
   * @returns 
   */
  isGuest() {
    return (this.get('is_guest'))
  }

  /**
   * 
   */
  name() {
    let n = this.fullname() || "";
    n = n.trim();
    if (_.isEmpty(n)) {
      n = this.get(_a.ident);
    }
  }

  /**
   * 
   * @returns 
   */
  domain_name() {
    return this.get(_a.domain) || bootstrap().main_domain;
  }

  /**
   * 
   * @returns 
   */
  languageClassName() {
    const n = "user-language-" + this.language();
    return n;
  }

  /**
   * 
   * @param {*} id 
   * @returns 
   */
  avatar(id, type = _a.vignette) {
    const a = this.get(_a.avatar);
    if (/^http/.test(a)) {
      return a;
    }
    const { protocol, endpointPath } = bootstrap();
    let base = `${endpointPath}avatar/`;
    id = id || this.id;
    const ts = `&${this.get(_a.mtime)}` || ""; //timestamp()
    if (/^\//.test(base)) {
      base = `${base}${id}?type=${type}${ts}`;
    } else {
      if (/^http/.test(base)) {
        base = `${base}${id}?type=${type}${ts}`;
      } else {
        base = `${protocol}://${base}${id}?type=${type}${ts}`;
      }
    }
    return base;
  }


  /**
   * 
   */
  audioTip(state = 1) {
    if (!window.Wm) return
    if (this._userHasInteracted) state = 0;
    if (!state) {
      if (Wm && Wm.alert) {
        Wm.alert()
      } else {
        Butler.sleep();
      }
      return;
    }
    if (Wm && Wm.alert) {
      Wm.alert(LOCALE.SYSTEM_SOUND_TIPS);
    } else {
      Butler.say(LOCALE.SYSTEM_SOUND_TIPS);
    }
  }

  /**
   * 
   * @param {*} url 
   * @param {*} l 
   */
  playSound(url, l) {
    let { protocol, static: base, user_domain: domain } = bootstrap();
    if (this.parseModuleArgs().silent) return;
    if (url == null) {
      url = `${base}${_K.ringtones.incoming}`;
    } else if (/^musics/.test(url)) {
      url = `${base}${url}`;
    }
    if (!/^http/.test(url)) {
      url = `${protocol}://${domain}${url}`;
    }
    if (l == null) { l = 1; }
    if (!this._audio) {
      this._audio = new Audio();
    }
    this._audio.loop = l;
    this._audio.preload = 'none';
    this._audio.src = url;
    this._audio.play().then(() => {
      if (this._userHasInteracted) return;
      this._userHasInteracted = 1;
      this.audioTip(0);
    }).catch((e) => {
      this.audioTip(1);
      RADIO_MOUSE.once(_e.mousedown, () => {
        this.audioTip(0);
        setTimeout(() => {
          this._audio.play(() => {
            this._userHasInteracted = 1
          });
        }, 200)
      });
    });
  }

  /**
   * 
   * @returns 
   */
  platform() {
    if (/electron/i.test(navigator.userAgent)) return 'electron';
    if (/dart/i.test(navigator.userAgent)) return _a.mobile;
    return _a.web;
  }


  /**
   * 
   */
  muteSound() {
    if (!this._audio) {
      return;
    }
    this._audio.pause();
    this._audio.currentTime = 0;
    localStorage.timePlaying = 0;
  }

  /**
   * @params {number} permission to check against the user
   * @params {number} user privilege against the permisition by default it is current user privilege
   * Example :
   *  Visitor.domainCan(_K.permission.admin_member)  
   *  Visitor.domainCan(_K.permission.admin_member, user.privilege)  
   * 
   * @param {*} permission 
   * @param {*} userPrivilege 
   * @returns 
   */
  domainCan(permission, userPrivilege) {
    if (userPrivilege == null) {
      userPrivilege = this.get(_a.privilege);
    }
    return userPrivilege & permission;
  }

  /**
   * 
   * @returns 
   */
  isB2B() {
    return Visitor.get(_a.subscription) === _a.b2b;
  }

  /**
   * 
   * @returns 
   */
  isB2C() {
    return Visitor.get(_a.subscription) === _a.b2c;
  }

  /**
   * 
   * @returns 
   */
  isHubUser() {
    return Visitor.get('profile_type') == 'hub';
  }

  /**
   * 
   * @param {*} module 
   * @returns 
   */
  canShow(module) {
    return true;
  }


  /**
   * this will check the user have the import and export permisition in server level
   *  
   * @returns _K.permission
   */
  canServerImpExp() {
    return this.domainCan(_K.permission.admin_security);
  }


  /**
   * To check the isMimicSession (Share desk is active) in the current session  
  //
   * @returns 
   */
  isMimicSession() {
    return (Visitor.get('mimic_type') === _a.mimic) || (Visitor.get('mimic_type') === _a.victim);
  }

  /** 
   * Whether Visitor is a Mimic (admin ) user  while share desk is active 
  //
  */
  isMimicUser() {
    return Visitor.get('mimic_type') === _a.mimic;
  }


  /**
   * Whether Visitor is is a victim while share desk is active 
   * @returns 
   */
  isVictimUser() {
    return Visitor.get('mimic_type') === _a.victim;
  }

  /**
   * To check the User is a Mimic while share desk is active 
   * and the victum is in active or block state
   * for now Block and active user are same 
   */
  isMimicActiveUser() {
    const status = Visitor.get(_a.status);
    const mimicType = Visitor.get('mimic_type');
    return (mimicType === _a.mimic) && ((status === _a.active) || (status === _a.block));
  }
}

let User;
function f(opt) {
  if (User) return User
  User = new __core_user(opt)
  return User;
};

module.exports = f;

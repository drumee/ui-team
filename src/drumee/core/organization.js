// ============================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE :
//   TYPE :
// ============================================================== *


class __core_organization extends Backbone.Model {
  /**
   *
   */
  initialize(o) {
    let { main_domain } = bootstrap();
    this.set({ ...o, main_domain });
    try {
      let metadata = this.metadata();
      let { userWallpaper, homeWallpaper } = metadata;
      if (_.isString(userWallpaper)) {
        metadata.userWallpaper = JSON.parse(userWallpaper);
      }
      if (_.isString(homeWallpaper)) {
        metadata.homeWallpaper = JSON.parse(homeWallpaper);
      }
      this.set({ metadata });
    } catch (e) { }
  }

  /**
   * 
   */
  listenChanges() {
    this.on(_e.change, (m) => {
      if (m.changed) {
        if (m.changed.link && Visitor.isOnline()) {
          uiRouter.changeHost(m.changed.link);
        }
      }
    });
  }
  /**
   *
   */
  metadata() {
    return this.get(_a.metadata) || {};
  }

  /**
   *
   */
  logo() { }

  /**
   *
   */
  host() {
    return this.get(_a.link);
  }

  /**
   * 
   */
  name() {
    let name = this.get(_a.name) || Host.get("org_name") || Host.get(_a.name) || Host.get(_a.domain) || "";
    return name.ucFirst();
  }

  /**
   *
   */
  welcomeWallpaper() {
    let {
      loginPageBackgroundImage,
      loginPreviewBackgroundImage,
      welcomeWallpaper,
    } = this.metadata();
    let { nid, hub_id } = welcomeWallpaper || {};
    if (nid && hub_id) return { nid, hub_id };

    const { static: static_root } = bootstrap();
    let base = static_root + "images/background/";
    if (/^(dmz|share)$/.test(Host.get(_a.area))) {
      let res = {
        url: base + 'dmz-sharebox-background.jpg',
        preview: base + 'dmz-sharebox-wallpaper-preview.jpg'
      }
      return res;
    }
    let url = loginPageBackgroundImage || `${base}/welcome-wallpaper.png`;
    let preview =
      loginPreviewBackgroundImage || `${base}/welcome-wallpaper-preview.png`;
    return { url, preview };
  }

  /**
   *
   */
  deskWallpaper() {
    let { defaultWallpaper, previewWallpaper, deskWallpaper } = this.metadata();
    let { nid, hub_id } = deskWallpaper || {};
    if (nid && hub_id) return { nid, hub_id };
    const { static: static_root } = bootstrap();
    let base = static_root + "images/background/";

    let url = defaultWallpaper || `${base}/desk-wallpaper.png`;
    let preview = previewWallpaper || `${base}/desk-wallpaper-preview.png`;
    return { url, preview };
  }
}

let Organization;

function f(opt) {
  if (Organization) return Organization
  Organization = new __core_organization(opt);
  return Organization;
}

module.exports = f;

const { uploadFile } = require("@drumee/ui-essentials");

/**
 * Full-area Settings page rendered into the desk main center
 * when the sidebar Settings entry is clicked.
 */
class settings_main extends LetcBox {
  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    // LetcBox auto-binds fetchService/postService but not uploadFile.
    this.uploadFile = uploadFile.bind(this);
    this.model.set({ hub_id: Visitor.id });
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
  }

  /**
   *
   */
  showError(content) {
    return this.ensurePart("error").then((p) => {
      p.set({ content });
      p.el.dataset.state = "1";
    });
  }

  /**
   *
   */
  async saveProfile() {
    const data = this.getData();
    const current = Visitor.profile() || {};
    const profile = {
      firstname: data.display_name || current.firstname,
      lastname: current.lastname,
      username: data.username,
      bio: data.bio,
    };
    // hub_id pins the ACL owner check to the user's personal hub
    // (acl/drumate.json: scope=hub, src=owner).
    const res = await this.postService(SERVICE.drumate.update_profile, {
      hub_id: Visitor.id,
      profile,
    });
    if (!res || res.error) return;
    Visitor.set({ profile: { ...current, ...res } });
    this.feed(require("./skeleton").default(this));
  }

  /**
   *
   */
  toggleEmailNotifications(cmd) {
    const next = cmd.mget(_a.state) ? 0 : 1;
    cmd.setState(next);
    const settings = { ...(Visitor.settings() || {}), email_notifications: next };
    this.postService({
      service: SERVICE.drumate.update_settings,
      settings,
      hub_id: Visitor.id,
    }).then(() => {
      Visitor.set({ settings });
    });
  }

  /**
   *
   */
  toggleTwoFactor(cmd) {
    const next = cmd.mget(_a.state) ? 0 : 1;
    cmd.setState(next);
    this.postService({
      service: SERVICE.desk.set_mfa,
      hub_id: Visitor.id,
      mfa: next,
    });
  }

  /**
   *
   */
  async changeEmail() {
    await Kind.waitFor("settings_change_email");
    return this.ensurePart("overlay").then((p) => {
      p.feed({ kind: "settings_change_email", uiHandler: [this] });
    });
  }

  /**
   *
   */
  async editPassword() {
    await Kind.waitFor("settings_change_password");
    return this.ensurePart("overlay").then((p) => {
      p.feed({ kind: "settings_change_password", uiHandler: [this] });
    });
  }

  /**
   *
   */
  closeOverlay() {
    return this.ensurePart("overlay").then((p) => p.clear());
  }

  /**
   *
   */
  openAvatarPicker() {
    return this.ensurePart("fileselector").then((p) => {
      if (!p || typeof p.open !== "function") return;
      p.open((e) => {
        const file = (e && e.target && e.target.files && e.target.files[0]) || null;
        if (file) this._uploadAvatar(file);
      });
    });
  }

  /**
   * nid=-2 routes the upload to configure_icon → Generator.create_avatar
   * via special_file() (server-core utils/mfs.js). nid=-1 would land it
   * as favicon.<ext>; -3 as something else.
   */
  _uploadAvatar(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) return;
    const xhr = this.uploadFile(file, { nid: -2, hub_id: Visitor.id });
    if (!xhr) return;
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        // Generator.create_avatar runs after the HTTP response is sent,
        // so wait briefly for the new PNG to land before refetching.
        setTimeout(() => this._refreshAvatar(), 800);
      } else {
        this.alert(LOCALE.AVATAR_UPLOAD_FAILED);
      }
    });
  }

  /**
   * Visitor.avatar() short-circuits to a stored `http://...` URL when
   * present (ui-core letc/user.js:604), bypassing mtime. Clear it so
   * the constructed `<endpoint>/avatar/<id>?ts=<mtime>` URL is used.
   */
  _refreshAvatar() {
    Visitor.set({ avatar: null, mtime: Date.now() });
    this.feed(require("./skeleton").default(this));
  }

  /**
   *
   */
  manageConnectedApps() {
    this.alert(LOCALE.COMING_SOON || "Coming soon");
  }

  /**
   *
   */
  exportData() {
    return this.postService({
      service: SERVICE.desk.disk_usage,
      hub_id: Visitor.id,
      list: 1,
    });
  }

  /**
   *
   */
  async confirmDeleteAccount() {
    await Kind.waitFor("settings_delete_account");
    return this.ensurePart("overlay").then((p) => {
      p.feed({ kind: "settings_delete_account", uiHandler: [this] });
    });
  }

  /**
   *
   */
  performDeleteAccount(args = {}) {
  }

  /**
   *
   */
  exportDeleteAccountSelection(args = {}) {
    return this.postService({
      service: SERVICE.desk.disk_usage,
      hub_id: Visitor.id,
      list: 1,
      selection: args.selection,
    });
  }

  /**
   *
   */
  cancelDeleteAccount() {
    return this.ensurePart("overlay").then((p) => p.clear());
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "save-profile":
        return this.saveProfile();

      case "edit-avatar":
      case "upload-avatar":
        return this.openAvatarPicker();

      case "toggle-email-notifications":
        return this.toggleEmailNotifications(cmd);

      case "toggle-two-factor":
        return this.toggleTwoFactor(cmd);

      case "manage-connected-apps":
        return this.manageConnectedApps();

      case "change-email":
        return this.changeEmail();

      case "edit-password":
        return this.editPassword();

      case "export-data":
        return this.exportData();

      case "delete-account":
        return this.confirmDeleteAccount();

      case "delete-account-confirm":
        return this.performDeleteAccount(args);

      case "delete-account-cancel":
        return this.cancelDeleteAccount();

      case "delete-account-download":
        return this.exportDeleteAccountSelection(args);

      case "change-password-cancel":
      case "change-password-done":
      case "change-email-cancel":
      case "change-email-done":
        return this.closeOverlay();

      case "change-email-success":
        // Visitor.profile was already updated inside the modal. Patch
        // just the email row's description in place — re-rendering the
        // whole skeleton would tear down the overlay (and the success
        // modal still showing on top of us).
        return this.ensurePart("credentials-email").then((p) => {
          if (p) p.set({ content: (args && args.email) || (Visitor.profile() || {}).email || "" });
        });

      default:
        return;
    }
  }
}

module.exports = settings_main;

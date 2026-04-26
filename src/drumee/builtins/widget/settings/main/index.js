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
    const profile = {
      firstname: data.display_name || Visitor.profile().firstname,
      lastname: Visitor.profile().lastname,
      username: data.username,
      bio: data.bio,
    };
    return this.postService(SERVICE.drumate.update_profile, {
      hub_id: Visitor.id,
      profile,
    }).then((res) => {
      if (!res || !res.email) return;
      Visitor.set({ profile: res });
    });
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
    await Kind.waitFor("settings_account");
    return this.ensurePart("overlay").then((p) => {
      p.feed({ kind: "settings_account" });
    });
  }

  /**
   *
   */
  async editPassword() {
    await Kind.waitFor("settings_account");
    return this.ensurePart("overlay").then((p) => {
      p.feed({ kind: "settings_account" });
    });
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
    return this.ensurePart("overlay").then((p) => {
      p.clear();
      this.postService(SERVICE.drumate.delete_account, {
        hub_id: Visitor.id,
        password: args.password,
      });
    });
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
        return this.ensurePart("avatar-widget").then((p) => p.selectFile());

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

      default:
        return;
    }
  }
}

module.exports = settings_main;

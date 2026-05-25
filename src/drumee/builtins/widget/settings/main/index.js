const { uploadFile } = require("@drumee/ui-essentials");
const { sendOtp, openOtpModal } = require("../../otp-gate");

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
  async onDomRefresh() {
    this._oauthLinks = await this._loadOauthLinks();
    this._reconcilePasswordSet();
    this.feed(require("./skeleton").default(this));
  }

  /**
   * Fetch the user's linked OAuth providers. Returns an array of
   * { provider, email, ctime, mtime } rows, or [] if the call fails.
   */
  async _loadOauthLinks() {
    try {
      const res = await this.fetchService(SERVICE.drumate.list_oauth_links, {
        hub_id: Visitor.id,
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch (e) {
      this.warn("settings_main: list_oauth_links failed", e);
      return [];
    }
  }

  async _refreshOauthLinks() {
    this._oauthLinks = await this._loadOauthLinks();
    this._reconcilePasswordSet();
    this.feed(require("./skeleton").default(this));
  }

  /**
   * Legacy users (signed up before profile.password_set was tracked)
   * have no flag in their profile. Infer from oauth_accounts membership
   * so the downstream "if undefined → assume password" fallback in
   * delete-account / change-email / the password row routes correctly.
   * No-op once an explicit flag is set by signup or a password setter.
   */
  _reconcilePasswordSet() {
    const profile = { ...(Visitor.profile() || {}) };
    if (profile.password_set !== undefined) return;
    const hasOauth = (this._oauthLinks || []).length > 0;
    profile.password_set = hasOauth ? 0 : 1;
    Visitor.set({ profile });
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
    // Split a single "Display Name" input into firstname / lastname on the
    // first space so chat sender (`${firstname} ${lastname}`) reflects the
    // typed value exactly — otherwise lastname kept its previous value and
    // the bubble label showed "newFirstname oldLastname".
    let firstname = current.firstname;
    let lastname = current.lastname;
    if (typeof data.display_name === 'string') {
      const raw = data.display_name.trim();
      const idx = raw.indexOf(' ');
      if (idx === -1) {
        firstname = raw;
        lastname = '';
      } else {
        firstname = raw.slice(0, idx);
        lastname = raw.slice(idx + 1).trim();
      }
    }
    const profile = {
      firstname,
      lastname,
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
    // Server returns the full updated profile object. Fall back to the
    // request payload if the response is an unexpected scalar/array so
    // Visitor.profile() reads fresh firstname/lastname either way.
    const nextProfile = (res && typeof res === 'object' && !Array.isArray(res))
      ? { ...current, ...res }
      : { ...current, ...profile };
    Visitor.set({ profile: nextProfile });
    this.feed(require("./skeleton").default(this));
  }

  /**
   *
   */
  toggleEmailNotifications(cmd) {
    // Read from the canonical Visitor settings (NOT cmd.mget(_a.state)).
    // With radiotoggle:1 the widget has already flipped its model state
    // by the time onUiEvent fires — reading cmd state would re-flip back
    // to the old value. Same pattern as toggleTwoFactor.
    const cur = (Visitor.settings() || {}).email_notifications ? 1 : 0;
    const next = cur ? 0 : 1;
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
   * Two-factor toggle requires an OTP step in both directions (enable
   * AND disable). Server desk.set_mfa() requires {secret, code} so an
   * attacker on the active session can't silently disable MFA without
   * also controlling the user's inbox.
   */
  async toggleTwoFactor(cmd) {
    if (this._mfaInFlight) return;
    this._mfaInFlight = true;

    const profile = Visitor.profile() || {};
    const prev = parseInt(profile.mfa) ? 1 : 0;
    const next = prev ? 0 : 1;

    cmd.setState(next);
    this._mfaCmd = cmd;
    this._mfaPrev = prev;
    this._mfaNext = next;

    const otp = await sendOtp(this);
    if (!otp) {
      return this._cancelMfa(LOCALE.UNKNOWN_ERROR);
    }

    return openOtpModal(this, {
      ...otp,
      api: SERVICE.desk.set_mfa,
      payload: { mfa: next },
      successService: "mfa-changed",
      cancelService: "mfa-cancel",
    });
  }

  _cancelMfa(errorMessage) {
    if (this._mfaCmd) this._mfaCmd.setState(this._mfaPrev);
    this._resetMfaState();
    if (errorMessage) this.alert(errorMessage);
    return this.closeOverlay();
  }

  _finalizeMfa() {
    const current = Visitor.profile() || {};
    const next = this._mfaNext;
    Visitor.set({
      profile: { ...current, mfa: next, otp: next ? "email" : 0 },
    });
    this._resetMfaState();
    return this.closeOverlay();
  }

  _resetMfaState() {
    this._mfaCmd = null;
    this._mfaPrev = null;
    this._mfaNext = null;
    this._mfaInFlight = false;
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
   * Disconnect an OAuth provider (Google, Apple, etc.).
   * Verifier branches on password_set, same as the other step-up flows.
   * The server refuses to remove the last auth method, so an OAuth-only
   * user with a single linked provider can't lock themselves out.
   *
   * @param {string} provider e.g. "google", "apple"
   */
  async disconnectOauth(provider) {
    if (!provider) return;
    const profile = Visitor.profile() || {};
    const passwordSet = profile.password_set;
    const usePassword = passwordSet === undefined || parseInt(passwordSet) === 1;

    if (usePassword) {
      // Password-mode placeholder — uses the native prompt. Replace
      // with a small password modal when polishing this surface.
      const password = prompt(LOCALE.CONFIRM_PASSWORD_LABEL || "Password");
      if (!password) return;
      try {
        const res = await this.postService({
          service: SERVICE.drumate.unlink_oauth,
          hub_id: Visitor.id,
          provider,
          password,
        });
        if (res && res.error) {
          return this.alert(res.error === "WRONG_CREDENTIALS"
            ? (LOCALE.WRONG_PASSOWRD || "Wrong password")
            : res.error);
        }
        return this._refreshOauthLinks();
      } catch (e) {
        this.warn("disconnectOauth (password): failed", e);
      }
      return;
    }

    const otp = await sendOtp(this);
    if (!otp) return this.alert(LOCALE.UNKNOWN_ERROR);
    return openOtpModal(this, {
      ...otp,
      api: SERVICE.drumate.unlink_oauth,
      payload: { provider },
      successService: "unlink-oauth-success",
      cancelService: "unlink-oauth-cancel",
    });
  }

  /**
   *
   */
  async exportData() {
    await Kind.waitFor("settings_export_data");
    return this.ensurePart("overlay").then((p) => {
      p.feed({ kind: "settings_export_data", uiHandler: [this] });
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

      case "mfa-changed":
        // dtk_otp emits success via this.mget(_a.service) — the same attr
        // the framework's __handleClick reads. Bare clicks on the dtk_otp
        // root therefore reach this case with `args` being a MouseEvent
        // (no `data`). The real success path passes {data, service} from
        // checkForm. Filter on the discriminator so stray clicks don't
        // close the modal.
        if (!args || !args.data) return;
        return this._finalizeMfa();

      case "mfa-cancel":
        return this._cancelMfa();

      case "disconnect-oauth":
        return this.disconnectOauth(cmd && cmd.mget("provider"));

      case "unlink-oauth-success":
        // Same shape constraint as "mfa-changed" — only act on the
        // programmatic checkForm trigger, not on stray dtk_otp clicks.
        if (!args || !args.data) return;
        this.closeOverlay();
        return this._refreshOauthLinks();

      case "unlink-oauth-cancel":
        return this.closeOverlay();

      case "change-email":
        return this.changeEmail();

      case "edit-password":
        return this.editPassword();

      case "export-data":
        return this.exportData();

      case "export-data-cancel":
        return this.closeOverlay();

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

      case "launch-gdrive-migration":
        // Open the migrate-gdrive popup. singleton:1 + wm_unique_id auto
        // detection (per fix/multi-folder-windows) prevents duplicates.
        return Kind.waitFor("migrate_gdrive_popup").then(() => {
          Wm.launch({
            kind: "migrate_gdrive_popup",
            hub_id: Visitor.id,
            nid: Visitor.get(_a.home_id),
            wm_unique_id: "migrate_gdrive_popup",
          }, { explicit: 1, singleton: 1 });
        });

      default:
        return;
    }
  }
}

module.exports = settings_main;

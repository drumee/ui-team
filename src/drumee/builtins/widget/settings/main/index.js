const { uploadFile, copyToClipboard } = require("@drumee/ui-essentials");
const { sendOtp, openOtpModal, resendOtpGate } = require("../../otp-gate");

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
    // True while a picked avatar is being converted (HEIC) and/or uploaded.
    // The skeleton reads this via isAvatarProcessing() to show the spinner.
    this._avatarProcessing = false;
  }

  /** Skeleton reads this to seed the avatar-frame's data-processing flag. */
  isAvatarProcessing() {
    return this._avatarProcessing;
  }

  /**
   * Toggle the processing state. Updates the instance flag (so a re-render
   * keeps the spinner) AND flips data-processing on the live frame so the
   * overlay appears instantly without waiting for a re-render.
   */
  _setAvatarProcessing(on) {
    this._avatarProcessing = !!on;
    const frame = this.el && this.el.querySelector('[data-partname="avatar-frame"]');
    if (frame) frame.dataset.processing = on ? "1" : "0";
  }

  /**
   *
   */
  async onDomRefresh() {
    // Load linked providers + the gdrive migration state in parallel so the
    // "Migrate from Google Drive" row reflects a running job (in-progress + %)
    // as soon as Settings opens, instead of always offering "Start".
    // Also refresh the authoritative profile (yp.hello → get_user) BEFORE
    // rendering: the 2FA switch reads Visitor.profile().mfa, and the local
    // copy can be stale right after load while other services are still in
    // flight — rendering then showed the wrong on/off state, so a click read
    // the wrong baseline and toggled the wrong way. Awaiting here means the
    // switch only renders once it reflects the server's stored mfa.
    const [links, gdrive, , referral] = await Promise.all([
      this._loadOauthLinks(),
      this._loadGdriveState(),
      this._refreshVisitorProfile(),
      this._loadReferral(),
    ]);
    this._oauthLinks = links;
    this._gdriveState = gdrive;
    this._referral = referral;
    this._reconcilePasswordSet();
    this.feed(require("./skeleton").default(this));
  }

  /**
   * Pull the authoritative user record (yp.hello → get_user) and respawn it
   * into Visitor so profile.mfa reflects the server's stored value. Best
   * effort: on failure we keep whatever Visitor already holds.
   */
  async _refreshVisitorProfile() {
    try {
      const data = await this.fetchService(SERVICE.yp.hello, { hub_id: Visitor.id });
      if (data) Visitor.respawn(data);
    } catch (e) {
      this.warn("settings_main: hello refresh failed", e);
    }
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

  /**
   * Fetch the gdrive migration state (google_drive.get_state) so the Linked
   * Accounts "Migrate" row can show live progress when a job is running.
   * Returns { ok, job, seen_job_id } or {} on failure.
   */
  async _loadGdriveState() {
    try {
      const res = await this.fetchService("google_drive.get_state", { hub_id: Visitor.id });
      return res || {};
    } catch (e) {
      this.warn("settings_main: gdrive get_state failed", e);
      return {};
    }
  }

  /** Skeleton reads this to render the Migrate row's state (running %, etc.). */
  getGdriveState() { return this._gdriveState || {}; }

  /**
   * Fetch the user's referral code + link (drumate.get_referral_code). POST to
   * avoid HTTP-cached GETs. Returns {referral_code, referral_url} or {error},
   * or {} on failure. Awaited in onDomRefresh so the card renders with values.
   */
  async _loadReferral() {
    try {
      const res = await this.postService(SERVICE.drumate.get_referral_code, { hub_id: Visitor.id });
      return res || {};
    } catch (e) {
      this.warn("settings_main: get_referral_code failed", e);
      return {};
    }
  }

  /** Skeleton reads this to render the referral card. */
  getReferral() { return this._referral || {}; }

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
      // Bio is optional — `|| ""` lets the profile save with an empty bio
      // (and lets a user clear it) instead of requiring some text first.
      bio: typeof data.bio === "string" ? data.bio : (current.bio || ""),
    };
    // hub_id pins the ACL owner check to the user's personal hub
    // (acl/drumate.json: scope=hub, src=owner).
    const res = await this.postService(SERVICE.drumate.update_profile, {
      hub_id: Visitor.id,
      profile,
    });
    if (!res || res.error) {
      // Surface the failure instead of silently doing nothing — otherwise
      // the user can't tell a click did anything at all.
      this._flashSaveStatus(false);
      return;
    }
    // Server returns the full updated profile object. Fall back to the
    // request payload if the response is an unexpected scalar/array so
    // Visitor.profile() reads fresh firstname/lastname either way.
    const nextProfile = (res && typeof res === 'object' && !Array.isArray(res))
      ? { ...current, ...res }
      : { ...current, ...profile };
    Visitor.set({ profile: nextProfile });
    // Re-render first (refreshes the displayed name/avatar), THEN reveal the
    // confirmation on the freshly-rendered "save-status" part.
    this.feed(require("./skeleton").default(this));
    this._flashSaveStatus(true);
  }

  /**
   * Briefly reveal the "Profile saved" pill next to the Save button so the
   * user gets visible confirmation. `ok=false` shows the failure variant.
   * The pill is part of the skeleton (sys_pn:"save-status", hidden at
   * data-state="0"); we flip it on, then fade it back out after a delay.
   */
  _flashSaveStatus(ok = true) {
    return this.ensurePart("save-status").then((p) => {
      if (!p || !p.el) return;
      p.set({
        content: ok
          ? (LOCALE.PROFILE_SAVED || "Profile saved")
          : (LOCALE.PROFILE_SAVE_FAILED || "Couldn't save profile. Please try again."),
      });
      p.el.dataset.variant = ok ? "success" : "error";
      p.el.dataset.state = "1";
      clearTimeout(this._saveStatusTimer);
      this._saveStatusTimer = setTimeout(() => {
        if (p.el) p.el.dataset.state = "0";
      }, ok ? 2500 : 4000);
    });
  }

  onBeforeDestroy() {
    clearTimeout(this._saveStatusTimer);
    clearTimeout(this._toastTimer);
    if (super.onBeforeDestroy) super.onBeforeDestroy();
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

    // The toggle's `also:click` behavior has ALREADY flipped the switch to the
    // user's intended state before this handler runs (see letc.js dispatch:
    // also:click fires before the ui-event signal). Read the intent straight
    // from the switch — deriving it from Visitor.profile().mfa is fragile
    // because that value can drift (e.g. an unreliable server echo), which
    // made "enable" compute next=0 and show the "disabled" toast.
    const next = parseInt(cmd.getState()) ? 1 : 0;
    const prev = next ? 0 : 1;

    cmd.setState(next);
    this._mfaCmd = cmd;
    this._mfaPrev = prev;
    this._mfaNext = next;
    // Spinner on the toggle while we request the OTP and load/open the modal:
    // sendOtp is a round-trip and dtk_otp is imported on demand, so there's a
    // visible gap before the modal appears.
    this._setMfaToggleLoading(1);

    const otp = await sendOtp(this, SERVICE.desk.set_mfa);
    if (otp && otp.locked) {
      return this._cancelMfa(otp.message);
    }
    if (!otp) {
      return this._cancelMfa(LOCALE.UNKNOWN_ERROR);
    }

    await openOtpModal(this, {
      ...otp,
      api: SERVICE.desk.set_mfa,
      payload: { mfa: next },
      successService: "mfa-changed",
      cancelService: "mfa-cancel",
      resendService: "otp-gate-resend",
    });
    // Modal is up; the spinner has served its purpose (and would sit behind
    // the overlay anyway).
    this._setMfaToggleLoading(0);
  }

  /**
   * Toggle the loading spinner on the MFA switch (see the `data-loading`
   * rule in the skin). No-op if the toggle reference isn't around.
   */
  _setMfaToggleLoading(on) {
    const cmd = this._mfaCmd;
    if (cmd && cmd.el) cmd.el.dataset.loading = on ? "1" : "0";
  }

  _cancelMfa(errorMessage) {
    this._resetMfaState();
    // Revert the optimistic switch flip back to the stored state. Set the
    // switch directly (not a full re-render) so a concurrent Visitor update
    // — e.g. the websocket reconnect fired when the tab regains focus — can't
    // race the read. errorMessage is only set on a genuine failure (e.g.
    // otp.send died); a plain user cancel passes nothing and stays silent.
    const mfaOn = parseInt((Visitor.profile() || {}).mfa) ? 1 : 0;
    return this.closeOverlay().then(() => {
      this._setMfaSwitch(mfaOn);
      if (errorMessage) return this._showToast(errorMessage, "error");
    });
  }

  _finalizeMfa(data) {
    // Trust the server's authoritative set_mfa response (get_user) for the
    // result, NOT this._mfaNext. _mfaNext is mutable instance state that a
    // concurrent cancel/reconnect (the tab-refocus handler reconnects the
    // socket + resyncs) can reset out from under us — which made a successful
    // "enable" toast "disabled". args.data here is the set_mfa response's own
    // fetch result (responses are independent, never cross-wired).
    let enabled = parseInt(this._mfaNext) ? 1 : 0;
    const p = this._profileFromResponse(data);
    if (p && p.mfa != null) enabled = parseInt(p.mfa) ? 1 : 0;

    const current = Visitor.profile() || {};
    Visitor.set({ profile: { ...current, mfa: enabled, otp: enabled ? "email" : 0 } });
    this._resetMfaState();
    return this.closeOverlay().then(() => {
      this._setMfaSwitch(enabled);
      return this._showToast(
        enabled
          ? (LOCALE.TWO_FACTOR_ENABLED || "Two-factor authentication enabled")
          : (LOCALE.TWO_FACTOR_DISABLED || "Two-factor authentication disabled"),
        "success"
      );
    });
  }

  /**
   * Set the MFA switch to a known state directly (no full re-render, which
   * would read the mutable Visitor.profile().mfa and could race concurrent
   * updates). Resolves the live switch part by sys_pn.
   */
  _setMfaSwitch(state) {
    return this.ensurePart("toggle-mfa").then((t) => {
      if (t && typeof t.setState === "function") t.setState(state ? 1 : 0);
    });
  }

  /**
   * Extract the profile object from a set_mfa (get_user) response. The profile
   * column comes back as a JSON string; tolerate an already-parsed object.
   */
  _profileFromResponse(data) {
    if (!data) return null;
    let p = data.profile;
    if (p == null) return null;
    if (typeof p === "string") {
      try { p = JSON.parse(p); } catch (e) { return null; }
    }
    return p;
  }

  /**
   * Show a transient toast at the top-right of the settings page.
   * `kind` drives both the colour and the glyph: "success" → app-check,
   * "error" → apps-warning (see the `__toast` rules in the skin).
   */
  _showToast(message, kind = "success") {
    this._toast = { message, kind };
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = null;
      this._renderToast();
    }, 3500);
    return this._renderToast();
  }

  _renderToast() {
    return this.ensurePart("settings-toast").then((part) => {
      if (!part) return;
      if (!this._toast) return part.feed([]);
      const pfx = this.fig.family;
      const { message, kind } = this._toast;
      const ico = kind === "error" ? "apps-warning" : "app-check";
      part.feed(
        Skeletons.Box.X({
          className: `${pfx}__toast ${pfx}__toast--${kind}`,
          kids: [
            Skeletons.Image.Svg({ ico, className: `${pfx}__toast-ico` }),
            Skeletons.Note({
              className: `${pfx}__toast-text`,
              content: message,
            }),
          ],
        })
      );
    });
  }

  _resetMfaState() {
    this._setMfaToggleLoading(0);
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
   * iPhone photos are HEIC/HEIF, which neither the browser nor the server's
   * GraphicsMagick avatar pipeline can decode — the raw upload reaches
   * create_avatar and `gm convert` fails, surfacing as AVATAR_UPLOAD_FAILED.
   * Detect by extension too: accept="image/*" lets .heic through but some
   * browsers report an empty `type` for it.
   */
  _isHeic(file) {
    const type = (file.type || "").toLowerCase();
    if (type === "image/heic" || type === "image/heif") return true;
    return /\.(heic|heif)$/i.test(file.name || "");
  }

  /**
   * Convert HEIC/HEIF to JPEG in the browser before upload. heic2any pulls a
   * libheif wasm worker, so it's loaded on demand only when a HEIC is picked
   * and never weighs on the main bundle.
   */
  async _convertHeic(file) {
    const mod = await import("heic2any");
    const heic2any = mod.default || mod;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(out) ? out[0] : out;
    const name = (file.name || "avatar").replace(/\.(heic|heif)$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  }

  /**
   * nid=-2 routes the upload to configure_icon → Generator.create_avatar
   * via special_file() (server-core utils/mfs.js). nid=-1 would land it
   * as favicon.<ext>; -3 as something else.
   */
  async _uploadAvatar(file) {
    if (!file) return;
    const heic = this._isHeic(file);
    if (!heic && (!file.type || !file.type.startsWith("image/"))) return;
    // Show the spinner now — HEIC conversion (libheif wasm) can take a few
    // seconds, well before the upload even starts.
    this._setAvatarProcessing(true);
    if (heic) {
      try {
        file = await this._convertHeic(file);
      } catch (e) {
        this.warn("settings_main: HEIC conversion failed", e);
        this._setAvatarProcessing(false);
        return this.alert(LOCALE.AVATAR_UPLOAD_FAILED);
      }
    }
    const xhr = this.uploadFile(file, { nid: -2, hub_id: Visitor.id });
    if (!xhr) {
      this._setAvatarProcessing(false);
      return;
    }
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        // Generator.create_avatar runs after the HTTP response is sent,
        // so wait briefly for the new PNG to land before refetching.
        // _refreshAvatar() clears the processing flag as it re-renders.
        setTimeout(() => this._refreshAvatar(), 800);
      } else {
        this._setAvatarProcessing(false);
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
    this._avatarProcessing = false;
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
   * @param {object} [cmd]    the clicked button view; flagged with
   *                          data-loading=1 during the network step
   *
   * Verifier choice (matches user's mental model — "what auth am I
   * using right now?"):
   *   - mfa=1                → email OTP (consistent with 2FA on)
   *   - mfa=0, password set  → password prompt (no extra friction)
   *   - oauth-only           → email OTP (only choice the user has)
   *
   * The server (drumate.unlink_oauth) accepts whichever credential is
   * sent and self-heals profile.password_set when password verifies.
   */
  async disconnectOauth(provider, cmd) {
    if (!provider) return;
    const setLoading = (on) => {
      if (!cmd || !cmd.el) return;
      if (on) cmd.el.dataset.loading = '1';
      else delete cmd.el.dataset.loading;
    };
    setLoading(true);
    try {
      const profile = Visitor.profile() || {};
      const mfaOn = parseInt(profile.mfa) === 1;
      const passwordSet = parseInt(profile.password_set) === 1;
      const hasOauth = Array.isArray(this._oauthLinks) && this._oauthLinks.length > 0;
      // Use password when 2FA is off AND user has a password (or the
      // flag is missing but they're clearly not oauth-only). Otherwise
      // fall through to OTP.
      const usePassword = !mfaOn && (passwordSet || !hasOauth);

      if (usePassword) {
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

      const otp = await sendOtp(this, SERVICE.drumate.unlink_oauth);
      if (otp && otp.locked) return this.alert(otp.message);
      if (!otp) return this.alert(LOCALE.UNKNOWN_ERROR);
      return openOtpModal(this, {
        ...otp,
        api: SERVICE.drumate.unlink_oauth,
        // unlink_oauth ACL is owner-on-hub. Force Visitor.id so the
        // request hits the user's own hub regardless of which
        // workspace the Settings panel was opened from.
        payload: { provider, hub_id: Visitor.id },
        successService: "unlink-oauth-success",
        cancelService: "unlink-oauth-cancel",
      });
    } finally {
      setLoading(false);
    }
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
   * "Manage subscription" (Settings billing card) → open the billing screen as
   * a FULL PAGE (Figma design), not a popup. settings_main is itself mounted in
   * the desk settings-main-slot with the desk as its uiHandler, so bubble
   * "upgrade-plan" up to the desk, which swaps this slot to the billing page.
   */
  openBilling() {
    this.triggerHandlers({ service: "upgrade-plan" });
  }

  /**
   * Billing card status line: "Renews on …" / "Your subscription will be
   * canceled on …" from payment.subscription_status (org-aware server-side).
   * Fired by onPartReady("billing-sub-status") so the fetch only runs when the
   * billing card is actually rendered.
   */
  onPartReady(child, pn) {
    if (pn === "billing-sub-status") {
      this._fillSubscriptionStatus(child);
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  async _fillSubscriptionStatus(part) {
    try {
      const sub = await this.fetchService(SERVICE.payment.subscription_status, { hub_id: Visitor.id });
      if (!part || !part.el || !sub || !sub.subscription_id) return;
      const when = sub.period_end ? Dayjs(Number(sub.period_end) * 1000).format("MMM D, YYYY") : "";
      if (!when) return;
      const canceled = ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);
      const text = canceled
        ? (LOCALE.SUBSCRIPTION_CANCELS_ON || "Your subscription will be canceled on {0}").format(when)
        : (LOCALE.SUBSCRIPTION_RENEWS_ON || "Your subscription renews on {0}").format(when);
      part.set({ content: text });
    } catch (e) {
      /* status line is cosmetic — leave empty on failure */
    }
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
   * Apply a display-mode choice (light/dark/system) from the Appearance
   * control. Delegates to the shared router/theme helper (persists +
   * applies + wires the OS listener for "system"), then updates the
   * segmented control's active highlight in place — no full re-render.
   */
  setThemeMode(mode) {
    if (!mode) return;
    // theme.js is light-locked (dark mode disabled), so the helper coerces
    // whatever comes in to "light" and the skeleton only renders the Light
    // option. Only sync the parts that actually exist — ensurePart on a
    // never-rendered "theme-opt-dark"/"-system" would hang forever.
    const applied = require("router/theme").setThemePreference(mode);
    this.ensurePart(`theme-opt-${applied}`).then((p) => {
      if (p && p.el) p.el.dataset.active = "1";
    });
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

      case "set-theme":
        return this.setThemeMode(cmd && cmd.mget && cmd.mget("theme_mode"));

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
        // args.data is the set_mfa response (get_user) — the source of truth
        // for the new mfa state.
        return this._finalizeMfa(args.data);

      case "mfa-cancel":
        return this._cancelMfa();

      case "otp-gate-resend":
        // dtk_otp delegated the resend (see resendService in toggleTwoFactor);
        // cmd is the dtk_otp widget. Shows a spinner on the resend link while
        // otp.send is in flight.
        return resendOtpGate(this, cmd);

      case "disconnect-oauth":
        return this.disconnectOauth(cmd && cmd.mget("provider"), cmd);

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

      case "copy-referral-code": {
        const v = (this._referral || {}).referral_code;
        if (v) {
          copyToClipboard(v);
          this._showToast(LOCALE.REFERRAL_CODE_COPIED || "Referral code copied", "success");
        }
        return;
      }

      case "copy-referral-link": {
        const v = (this._referral || {}).referral_url;
        if (v) {
          copyToClipboard(v);
          this._showToast(LOCALE.REFERRAL_LINK_COPIED || "Referral link copied", "success");
        }
        return;
      }

      case "open-billing":
        // Open the billing UI as a popup OVER the Settings page (settings_main
        // overlay), same mechanism as change-email/export-data. settings_billing
        // bubbles "billing-close" back here to dismiss.
        return this.openBilling();

      case "billing-close":
        return this.closeOverlay();

      case "launch-gdrive-migration":
        // Downgrade over-limit: a migration only ADDS bytes, so the feature
        // is off while the workspace is over its plan limits — refuse with
        // words here instead of opening a popup whose import can only fail
        // (the clamp also blocks the google_drive namespace server-side).
        if (require("libs/over-limit").guardWrite("write")) return;
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

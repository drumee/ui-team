/* ==================================================================== *
 * member_card
 * The card a person's avatar opens -- B2B Org Structure Figma 978:125420
 * ("card hover when user click other avatar in other screen"), and the
 * contact half of the org chart's edit member (910:81010, "edit contact,
 * sync with contact page").
 *
 * Name, title and departments come from organization.member_card. Email and
 * phone are the viewer's CONTACT entry for that person (contact.of_user), the
 * very record the Contacts page edits, so what is changed here is what the
 * Contacts page shows, and the other way round. With no entry yet, the email
 * is their login email (910:81513 "auto sync with their login email"), and
 * saving creates the entry.
 *
 * Hosted by Wm's wrapper-modal (Wm "member-card"), like the department form.
 * ==================================================================== */

/**
 * Ring one person (1:1 "Drumee connect" call) -- the Contacts panel's Call:
 * libs/p2p-call's startP2PCall, kept here so the card does not depend on a
 * module every branch may not carry.
 */
function startP2PCall(callee, opt = {}) {
  const guest_id = callee && (callee.drumate_id || callee.entity_id || callee.uid || callee.id);
  if (!guest_id) return false;
  if (Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting")) {
    Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
    return false;
  }
  const name = callee.fullname || callee.display
    || `${callee.firstname || ""} ${callee.lastname || ""}`.trim();
  Wm.launch({
    kind: "window_connect",
    hub_id: Visitor.id,
    nid: Visitor.get(_a.home_id) || Visitor.get(_a.nid),
    filename: name,
    display: name,
    callee: { ...callee, drumate_id: guest_id },
    video: opt.video === 0 ? 0 : 1,
    audio: 1,
  }, { explicit: 1, singleton: 1 });
  return true;
}

// What is being typed in the contact fields, per person, across repaints: a
// host dialog (Edit member) redraws itself, and the card inside it, on every
// pick. { phone, email }
const drafts = new Map();

// A refusal is a SHOUT_CASE code; a contact record carries its lifecycle
// status ("active", "memory"...), which is not one (same rule as the
// Contacts page).
const refused = (res) => !res || (typeof res.status === "string" && /^[A-Z][A-Z0-9_]*$/.test(res.status));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const lower = (v) => String(v || "").trim().toLowerCase();

class __member_card extends LetcBox {

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._uid = String(this.mget(_a.uid) || "");
    this._person = null;
    this._contact = null;
    this._loaded = false;
  }

  onDomRefresh() {
    // Embedded in a host dialog: no frame of its own (skin).
    if (this.mget("embedded")) this.el.dataset.embedded = "1";
    this.feed(require("./skeleton")(this));
    this._load();
  }

  async _load() {
    const uid = this._uid;
    if (!uid) return this._close();
    const [person, contact] = await Promise.all([
      SERVICE.organization && SERVICE.organization.member_card
        ? this.postService(SERVICE.organization.member_card, { hub_id: Visitor.id, uid }).catch(() => null)
        : null,
      SERVICE.contact && SERVICE.contact.of_user
        ? this.postService(SERVICE.contact.of_user, { hub_id: Visitor.id, uid }).catch(() => null)
        : null,
    ]);
    if (this.isDestroyed && this.isDestroyed()) return;
    // Outside an organisation (or someone not in it) the card still shows the
    // person, from what the caller passed in and the contact entry.
    const given = this.mget("person") || {};
    this._person = person && !refused(person)
      ? person
      : { uid, fullname: given.fullname || given.display || "", email: given.email || "", departments: [] };
    this._contact = contact && contact.contact_id ? contact : null;
    this._phone = this._defaultPhone();
    this._email = this._defaultEmail();
    this._loaded = true;
    this.feed(require("./skeleton")(this));
    requestAnimationFrame(() => this._bindDrafts());
  }

  /** Keep what is typed in phone / email across a host's repaint. */
  _bindDrafts() {
    for (const field of ["phone", "email"]) {
      const input = this._input(field);
      if (!input) continue;
      const draft = drafts.get(this._uid);
      if (draft && draft[field] != null) input.value = draft[field];
      input.addEventListener("input", () => {
        drafts.set(this._uid, { ...(drafts.get(this._uid) || {}), [field]: input.value });
      });
    }
  }

  /** The contact's first mobile number, as the Contacts page lists it. */
  _defaultPhone() {
    const list = (this._contact && Array.isArray(this._contact.mobile)) ? this._contact.mobile : [];
    const m = list[0];
    if (!m) return "";
    return [m.areacode, m.phone].filter(Boolean).join(" ").trim();
  }

  /**
   * The contact's default email, else their login email (910:81513 "auto sync
   * with their login email").
   */
  _defaultEmail() {
    const list = (this._contact && Array.isArray(this._contact.email)) ? this._contact.email : [];
    const e = list.find((x) => x && ~~x.is_default) || list[0];
    return (e && e.email) || (this._person && this._person.email) || "";
  }

  _name() {
    const p = this._person || {};
    return p.fullname || `${p.firstname || ""} ${p.lastname || ""}`.trim() || p.email || "";
  }

  _peer() {
    const p = this._person || {};
    return {
      entity_id: this._uid, drumate_id: this._uid, uid: this._uid,
      firstname: p.firstname, lastname: p.lastname, fullname: this._name(), display: this._name(),
    };
  }

  _close() {
    // Embedded, the host dialog decides when to go.
    if (this.mget("embedded")) return null;
    if (this.parent && _.isFunction(this.parent.clear)) return this.parent.clear();
    return this.goodbye();
  }

  _input(cls) {
    return this.el && this.el.querySelector(`.${this.fig.family}__${cls} input, .${this.fig.family}__${cls} textarea`);
  }

  _note(message, ok) {
    return this.ensurePart("status").then((p) => {
      if (!p) return;
      p.el.dataset.ok = ok ? 1 : 0;
      p.setState(message ? 1 : 0);
      p.set({ content: message || "" });
    });
  }

  _refusal(res) {
    const code = res && res.status;
    return (code && LOCALE[code] && LOCALE[code] !== code && LOCALE[code])
      || LOCALE.SOMETHING_WENT_WRONG || "Something went wrong.";
  }

  async _send() {
    const input = this._input("message");
    const message = String((input && input.value) || "").trim();
    if (!message || this._sending) return;
    this._sending = 1;
    const res = await this.postService(SERVICE.chat.post, {
      hub_id: Visitor.id, entity_id: this._uid, message,
    }).catch(() => null);
    this._sending = 0;
    if (refused(res)) return this._note(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong.");
    if (input) input.value = "";
    return this._note(LOCALE.MESSAGE_SENT || "Message sent", 1);
  }

  _chat() {
    const desk = window.Desk;
    this._close();
    if (desk && _.isFunction(desk.openPeerChat)) desk.openPeerChat(this._peer());
  }

  _call() {
    if (startP2PCall(this._peer(), { video: 0 })) this._close();
  }

  async _addContact() {
    const res = await this.postService(SERVICE.contact.add, {
      hub_id: Visitor.id, invitee_id: this._uid,
    }).catch(() => null);
    if (refused(res)) return this._note(this._refusal(res));
    await this._load();
    return this._note(LOCALE.CONTACT_ADDED || "Added to your contacts", 1);
  }

  async _update() {
    const ok = await this.saveContact();
    if (ok) return this._close();
  }

  /** Forget what was typed (the host dialog was cancelled). */
  discard() {
    drafts.delete(this._uid);
  }

  /** Former name, kept for hosts that still call it. */
  savePhone() {
    return this.saveContact();
  }

  /**
   * Save phone and email to the viewer's contact entry for this person, when
   * they changed: contact.update, the Contacts page's own save (created first
   * with contact.add when there is no entry). Public: a host dialog embedding
   * the card (Edit member) calls it on its own Update.
   *
   * The email edits the DEFAULT address; the person's login email is kept in
   * the list beside it, so the entry stays theirs (contact.of_user finds it by
   * that address too).
   *
   * @returns {Promise<Boolean>} true when there was nothing to do or it saved
   */
  async saveContact() {
    if (!this._loaded) return true;
    const phoneInput = this._input("phone");
    const emailInput = this._input("email");
    const phone = String((phoneInput && phoneInput.value) || "").trim();
    const email = String((emailInput && emailInput.value) || "").trim();
    const phoneChanged = phone !== this._phone;
    const emailChanged = !!emailInput && lower(email) !== lower(this._email);
    if (!phoneChanged && !emailChanged) {
      drafts.delete(this._uid);
      return true;
    }
    if (emailChanged && !EMAIL_RE.test(email)) {
      this._note(LOCALE.INVITE_EMAIL_INVALID || "Please enter a valid email address.");
      return false;
    }

    // No entry yet: create it (by user id, the Contacts page's link to them).
    if (!this._contact) {
      const res = await this.postService(SERVICE.contact.add, {
        hub_id: Visitor.id, invitee_id: this._uid,
      }).catch(() => null);
      if (refused(res)) {
        this._note(this._refusal(res));
        return false;
      }
      const fresh = await this.postService(SERVICE.contact.of_user, { hub_id: Visitor.id, uid: this._uid })
        .catch(() => null);
      if (!fresh || !fresh.contact_id) {
        this._note(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong.");
        return false;
      }
      this._contact = fresh;
    }

    const c = this._contact;
    const p = this._person || {};
    // The card shows (and edits) the FIRST number: contact_phone keeps no
    // default flag, so the rest are kept as they are, after it.
    const keptPhones = (c.mobile || []).slice(1)
      .map((m) => ({ phone: m.phone, areacode: m.areacode || "", category: m.category || "priv" }));
    const mobile = phoneChanged
      ? (phone ? [{ phone, areacode: "", category: "priv", is_default: 1 }, ...keptPhones] : keptPhones)
      : (c.mobile || []).map((m) => ({ phone: m.phone, areacode: m.areacode || "", category: m.category || "priv" }));

    let emails = (c.email || []).map((e) => ({
      email: e.email, category: e.category || "priv", is_default: ~~e.is_default ? 1 : 0,
    }));
    if (emailChanged) {
      const shown = lower(this._email);
      const rest = emails.filter((e) => lower(e.email) !== shown && lower(e.email) !== lower(email))
        .map((e) => ({ ...e, is_default: 0 }));
      emails = [{ email, category: "priv", is_default: 1 }, ...rest];
      const login = lower(p.email);
      if (login && !emails.some((e) => lower(e.email) === login)) {
        emails.push({ email: p.email, category: "priv", is_default: 0 });
      }
    }

    const res = await this.postService(SERVICE.contact.update, {
      hub_id: Visitor.id,
      contact_id: c.contact_id,
      firstname: c.firstname || p.firstname || "",
      lastname: c.lastname || p.lastname || "",
      surname: c.surname || "",
      email: emails,
      mobile,
      address: c.address || [],
    }).catch(() => null);
    if (refused(res)) {
      this._note(this._refusal(res));
      return false;
    }
    this._phone = phone;
    if (emailChanged) this._email = email;
    drafts.delete(this._uid);
    RADIO_BROADCAST.trigger("contact:changed", { uid: this._uid });
    return true;
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd.get && cmd.get(_a.service));
    switch (service) {
      case _e.close:
      case "member-card-cancel":
        this.discard();
        return this._close();
      case "member-card-send":
        return this._send();
      case "member-card-chat":
        return this._chat();
      case "member-card-call":
        return this._call();
      case "member-card-add-contact":
        return this._addContact();
      case "member-card-update":
        return this._update();
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __member_card;

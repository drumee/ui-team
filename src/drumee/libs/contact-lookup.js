/**
 * Address-book lookup for the workspace-invite pickers.
 *
 * Every "invite someone into this workspace" surface lets you type a full
 * email address. This module adds the other half: the typed string is also
 * looked up in the caller's address book — against EVERY address a contact
 * holds, not just their name — so a half-typed address offers the matching
 * contacts as a dropdown.
 *
 * Why a new service: `drumate.my_contacts` (and `contact.my_contacts`) run
 * `contact_search_next` / `my_contact`, whose WHERE clause compares the key
 * to `firstname` / `lastname` / `surname` / `source` only. `contact_email`
 * is joined for display, never for matching — so typing `jo` finds "John"
 * but `john@` finds nothing. `contact.lookup` (proc `my_contact_lookup`)
 * matches all `contact_email` rows, the contact's `entity`, and the linked
 * drumate's account email, and answers one row per matching ADDRESS.
 *
 * `contact.lookup` may not be deployed yet on a given server, so every call
 * degrades to the old name-only service rather than breaking the picker.
 *
 * Consumers: widget/invite-popup, permission/restricted, window/folder's
 * settings-action panel, and the shared widget/invitation searchbox.
 */

const { keepListThroughClick } = require("libs/pick-guard");

/** The lookup service when the server exposes it, else null. */
function lookupService() {
  return (SERVICE.contact && SERVICE.contact.lookup) || null;
}

/**
 * Service descriptor for the widgets that hand an `api` object to the
 * framework's search Entry (it appends `value` and POSTs). Falls back to the
 * legacy name-only search when `contact.lookup` is absent.
 *
 * @param {object} [opt] extra params merged into the descriptor
 */
function lookupApi(opt = {}) {
  const service = lookupService();
  if (!service) {
    // Byte-for-byte the descriptor these call sites used before, so an
    // un-upgraded server behaves exactly as it did. Extra params are passed
    // through untouched: the legacy service reads what it knows via
    // `input.use` and ignores the rest.
    return { service: SERVICE.drumate.my_contacts, hub_id: Visitor.id, ...opt };
  }
  return { service, hub_id: Visitor.id, ...opt };
}

/**
 * One row per matching address, best match first.
 *
 * @param {LetcBox} widget any widget (for fetchService)
 * @param {object}  opt
 * @param {string}  opt.value    typed string (email fragment or name)
 * @param {array}   [opt.exclude] addresses already picked
 * @param {number}  [opt.only_drumate] 1 = registered users only
 * @param {number}  [opt.limit]  cap applied client-side
 * @returns {Promise<Array>} normalized rows — never rejects
 */
async function lookupContacts(widget, opt = {}) {
  const value = String(opt.value || "").trim();
  const exclude = (opt.exclude || []).map((e) => String(e || "").toLowerCase());
  const service = lookupService();

  const payload = service
    ? {
        service,
        hub_id: Visitor.id,
        value,
        filter: exclude,
        only_drumate: opt.only_drumate || 0,
      }
    : {
        // Legacy shape: the old procs wildcard nothing themselves, so the
        // trailing '%' is what made them prefix-match.
        service: SERVICE.drumate.my_contacts,
        hub_id: Visitor.id,
        value: value ? `${value}%` : value,
        filter: exclude,
        status: "paper",
      };

  let rows;
  try {
    rows = await widget.fetchService(payload, { async: 1 });
  } catch (err) {
    return [];
  }
  // A one-row answer arrives as a bare object, not a single-element array.
  if (rows && !Array.isArray(rows) && rows.email) rows = [rows];
  if (!Array.isArray(rows)) return [];

  // Never offer the caller their own address — no surface can invite it.
  let own = "";
  try {
    own = String((Visitor.profile() || {}).email || "").toLowerCase();
  } catch (e) {
    own = String(Visitor.get(_a.email) || "").toLowerCase();
  }
  const seen = new Set(exclude);
  const out = [];
  for (const row of rows) {
    const email = String((row && row.email) || "").trim().toLowerCase();
    if (!email || email === own || seen.has(email)) continue;
    seen.add(email);
    out.push(normalize(row, email));
    if (opt.limit && out.length >= opt.limit) break;
  }
  return out;
}

/** Row shape the pickers render from, whichever service answered. */
function normalize(row, email) {
  const firstname = row.firstname || "";
  const lastname = row.lastname || "";
  const name =
    row.fullname ||
    [firstname, lastname].filter(Boolean).join(" ").trim() ||
    row.surname ||
    "";
  return {
    id: row.id || row.uid || null,
    contact_id: row.contact_id || null,
    email,
    firstname,
    lastname,
    name,
    category: row.category || null,
    is_drumate: row.is_drumate ? 1 : 0,
  };
}

/**
 * Single-line label for a suggestion: "Jane Doe · jane@acme.com", or the bare
 * address when the contact has no name on file.
 *
 * NEVER bracket the address as "Name <jane@acme.com>": Note content is
 * injected as innerHTML through DOMPurify (ui-core widgets/text →
 * `dompurify.sanitize(c, {ALLOWED_TAGS})`), which reads `<jane@acme.com>` as
 * an unknown tag and strips it — the row then shows the name and swallows the
 * address. suggestionRows renders the two as separate elements instead.
 */
function suggestionLabel(row) {
  return row.name ? `${row.name} · ${row.email}` : row.email;
}

/**
 * Suggestion rows for a dropdown part.
 *
 * Name and address are separate Notes (`{className}-name` / `-email`), never
 * one "Name <addr>" string — see suggestionLabel for why that string loses the
 * address. A contact with no name on file renders the address alone, so every
 * row always shows the thing being picked.
 *
 * The address is carried both as a model prop and in the dataset: handlers
 * read `mget()` first and fall back to the DOM, and the renderer drops a
 * lone `dataset` unless an attribute map rides along with it.
 *
 * @param {Array}  rows  normalized rows from lookupContacts
 * @param {object} opt   { className, service, uiHandler }
 */
function suggestionRows(rows, opt = {}) {
  const { className, service, uiHandler } = opt;
  return rows.map((row) => {
    const kids = [];
    if (row.name) {
      kids.push(
        Skeletons.Note({
          className: `${className}-name`,
          content: row.name,
        }),
      );
    }
    kids.push(
      Skeletons.Note({
        className: `${className}-email`,
        content: row.email,
      }),
    );
    return Skeletons.Box.X({
      className,
      service,
      uiHandler: [uiHandler],
      email: row.email,
      uid: row.id || "",
      dataset: { email: row.email },
      attrOpt: { "data-email": row.email },
      kids,
    });
  });
}

/**
 * Turn a plain email Entry into a combobox: typing looks the string up in
 * the address book and feeds `listPart` with the matches; the widget picks
 * one up through its own `onUiEvent` case for `service`.
 *
 * Listeners are delegated from the widget root and installed once, because
 * these panels rebuild their skeleton (and with it the Entry) on every
 * member refresh — a listener bound to the input would be lost.
 *
 * @param {LetcBox} widget
 * @param {object}  opt
 * @param {string}  opt.entryClass class on the Entry that owns the input
 * @param {string}  opt.listPart   sys_pn of the suggestions box
 * @param {string}  opt.service    service fired when a row is clicked
 * @param {string}  opt.itemClass  class for each suggestion row
 */
function attachEmailLookup(widget, opt = {}) {
  if (!widget || !widget.el || widget._emailLookupInstalled) return;
  widget._emailLookupInstalled = true;

  const { entryClass, listPart, service, itemClass } = opt;
  const isInput = (t) =>
    t && t.matches && t.matches("input") && t.closest(`.${entryClass}`);

  // A debounce can outlive the widget (closing the panel mid-search), and
  // ensurePart on a destroyed widget never resolves — bail before asking.
  const alive = () =>
    !!widget.el && !(widget.isDestroyed && widget.isDestroyed());

  const feed = (rows) => {
    if (!alive()) return;
    // ensurePart resolves against the CURRENT part: registerPart overwrites
    // _branches[name] on every render, so a panel that re-feeds its skeleton
    // (member refresh) still lands in the live box, not a destroyed one.
    widget
      .ensurePart(listPart)
      .then((part) => {
        if (!part || part.isDestroyed?.() || !alive()) return;
        part.feed(
          suggestionRows(rows, {
            className: itemClass,
            service,
            uiHandler: widget,
          }),
        );
        // A press on a row must not blur the entry, or the 200 ms focusout
        // close below fires mid-click and the pick is lost.
        keepListThroughClick(part.el, `.${itemClass}`);
        if (part.el) part.el.dataset.state = rows.length ? 1 : 0;
      })
      .catch(() => {
        /* not mounted yet */
      });
  };

  const close = () => feed([]);
  widget._closeEmailLookup = close;

  const search = (value) => {
    const typed = String(value || "").trim();
    if (typed.length < 2) return close();
    clearTimeout(widget._emailLookupTimer);
    // Supersede in-flight answers so a slow one cannot repopulate the list
    // after the user typed on.
    const seq = (widget._emailLookupSeq = (widget._emailLookupSeq || 0) + 1);
    widget._emailLookupTimer = setTimeout(async () => {
      const rows = await lookupContacts(widget, { value: typed, limit: 8 });
      if (seq !== widget._emailLookupSeq) return;
      feed(rows);
    }, 250);
  };

  widget.el.addEventListener("input", (e) => {
    if (!isInput(e.target)) return;
    search(e.target.value);
  });

  // Deferred close: clicking a row blurs the input first, so tearing the
  // list down synchronously would swallow the pick.
  widget.el.addEventListener("focusout", (e) => {
    if (!isInput(e.target)) return;
    clearTimeout(widget._emailLookupBlurTimer);
    widget._emailLookupBlurTimer = setTimeout(close, 200);
  });
  widget.el.addEventListener("focusin", (e) => {
    if (!isInput(e.target)) return;
    clearTimeout(widget._emailLookupBlurTimer);
  });
}

/**
 * Write a picked address into the Entry the lookup is attached to.
 *
 * The DOM write comes first and stands on its own: Entry#setValue does
 * `this._input.value = val` with no null guard, so it throws outright when
 * called before the input exists — it must not be what the fill depends on.
 * It still runs (in a try) to keep the widget's model in step with the field.
 */
function fillEntry(part, email) {
  if (!part) return;
  const input = part.el && part.el.querySelector("input");
  if (input) {
    input.value = email;
    input.focus();
  }
  try {
    if (typeof part.setValue === "function") part.setValue(email);
  } catch (e) {
    /* input not mounted yet — the DOM write above already did the work */
  }
}

module.exports = {
  lookupService,
  lookupApi,
  lookupContacts,
  suggestionLabel,
  suggestionRows,
  attachEmailLookup,
  fillEntry,
};

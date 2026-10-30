// ===========================================================
//  Notion-style Note — the page head (Lexis's Figma, 2026-10-22).
//
//  Everything between the header and the text: the cover banner, the
//  "Add icon · Add cover · Add comment" row, the page icon and the comment
//  bar. The window (./index.js) owns saving; this module owns drawing these
//  parts and answering their clicks, so the window stays about the window.
// ===========================================================

const { uploadFile } = require("@drumee/ui-essentials");

const RECENT_KEY = "drumee.note.recentEmojis";
const RECENT_MAX = 32;
const SEARCH_MAX = 64;

/**
 * Emoji categories in the Figma's tab order, keyed by emoji-mart's ids.
 * Labels are read at call time: LOCALE is not ready when this module loads.
 */
const CATEGORIES = [
  { id: "people", ico: "ph-smiley", label: () => LOCALE.NOTE_EMOJI_PEOPLE },
  { id: "nature", ico: "ph-leaf", label: () => LOCALE.NOTE_EMOJI_NATURE },
  { id: "foods", ico: "ph-hamburger", label: () => LOCALE.NOTE_EMOJI_FOODS },
  { id: "places", ico: "ph-airplane-tilt", label: () => LOCALE.NOTE_EMOJI_PLACES },
  { id: "activity", ico: "ph-football", label: () => LOCALE.NOTE_EMOJI_ACTIVITY },
  { id: "objects", ico: "ph-lightbulb", label: () => LOCALE.NOTE_EMOJI_OBJECTS },
  { id: "symbols", ico: "ph-peace", label: () => LOCALE.NOTE_EMOJI_SYMBOLS },
  { id: "flags", ico: "ph-flag", label: () => LOCALE.NOTE_EMOJI_FLAGS },
];

let emojiData;
/**
 * emoji-mart's data set — names, keywords, categories. It is already a
 * dependency of BlockNote (its own ":" picker loads it the same way), so this
 * is the same lazy chunk, fetched the first time a picker opens, never at boot.
 * @returns {Promise<Object>}
 */
function loadEmojiData() {
  if (!emojiData) {
    emojiData = import(/* webpackChunkName: "emoji-data" */ "@emoji-mart/data").then(
      (m) => m.default || m
    );
  }
  return emojiData;
}

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list.filter((e) => typeof e === "string") : [];
  } catch (e) {
    return [];
  }
}

function writeRecent(emoji) {
  try {
    const list = [emoji, ...readRecent().filter((e) => e !== emoji)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch (e) {
    /** private mode: the picker simply has no history */
  }
}

/**
 * A chat message as plain text. Messages are stored the way the chat composer
 * writes them (`<` and `>` as entities, links as anchors), so the text is read
 * back through a detached parser — which runs nothing — and shown as text.
 * @param {String} html
 * @returns {String}
 */
function plainText(html) {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    return (doc.body.textContent || "").trim();
  } catch (e) {
    return `${html}`;
  }
}

/**
 * Same encoding the chat composer applies (widget/chat), so a comment reads
 * the same in the file's chat thread.
 * @param {String} text
 */
function encodeMessage(text) {
  const map = { "<": "&#60;", ">": "&#62;" };
  return `${text}`.replace(/[<>]/g, (m) => map[m]);
}

function threadSvc(name) {
  const c = (typeof SERVICE !== "undefined" && SERVICE.channel) || {};
  return c[`file_thread_${name}`] || `channel.file_thread_${name}`;
}

/**
 * Feed a slot only when what it shows has changed. Repainting is triggered by
 * every save, and re-feeding the comment bar would wipe a half-typed comment;
 * re-feeding the cover would reload the image.
 * @param {View} ui
 * @param {String} pn
 * @param {String} key what the slot shows, as a comparable string
 * @param {Function} build returns the skeleton
 */
function paintSlot(ui, pn, key, build) {
  ui._painted = ui._painted || {};
  if (ui._painted[pn] === key) return Promise.resolve(null);
  ui._painted[pn] = key;
  return feedPart(ui, pn, build());
}

/** Feed a named part, if it is mounted. */
function feedPart(ui, pn, content) {
  if (!ui.ensurePart) return Promise.resolve(null);
  return ui
    .ensurePart(pn)
    .then((p) => {
      if (!p || p.isDestroyed()) return null;
      p.feed(content);
      return p;
    })
    .catch(() => null);
}

// ---------------------------------------------------------------------------
//  Painting
// ---------------------------------------------------------------------------

/**
 * Redraw the page head from the window's state. Cheap — a handful of parts —
 * so every change repaints everything rather than patching pieces.
 * @param {View} ui the editor window
 */
function paint(ui) {
  if (!ui || ui.isDestroyed()) return;
  const { icon, cover } = ui.page();
  const editable = ui.canEditNote();
  const commentsOpen = !!(ui._commentsOpen || (ui._comments && ui._comments.length));

  if (ui.el) {
    ui.el.dataset.cover = cover ? "1" : "0";
    ui.el.dataset.icon = icon ? "1" : "0";
    ui.el.dataset.comments = commentsOpen ? "1" : "0";
  }

  const offer = {
    icon: editable && !icon,
    cover: editable && !cover,
    comment: !commentsOpen && canComment(ui),
  };
  const empty = !offer.icon && !offer.cover && !offer.comment;
  paintSlot(ui, "page-actions", JSON.stringify(offer), () =>
    require("./skeleton/page-actions")(ui, offer)
  ).then((p) => {
    if (p && p.el) p.el.dataset.empty = empty ? "1" : "0";
  });
  paintSlot(ui, "page-icon", `${icon}|${editable}`, () =>
    icon ? require("./skeleton/page-icon")(ui, icon, editable) : []
  );
  paintSlot(ui, "page-cover", `${JSON.stringify(cover)}|${editable}`, () =>
    cover ? require("./skeleton/cover")(ui, cover, editable) : []
  );
  const comments = ui._comments || [];
  const last = comments[comments.length - 1];
  paintSlot(
    ui,
    "page-comments",
    commentsOpen ? `open|${comments.length}|${last ? last.message_id || last.message : ""}` : "closed",
    () => (commentsOpen ? require("./skeleton/comments")(ui, comments) : [])
  );

  if (!ui._commentsLoaded && ui.mget(_a.nid)) loadComments(ui);
}

/**
 * Comments live in the file's chat thread, so the people allowed to chat in
 * the workspace are the people who can comment. Not offered outside it.
 */
function canComment(ui) {
  return !Visitor.inDmz && !ui._readOnly;
}

// ---------------------------------------------------------------------------
//  Icon
// ---------------------------------------------------------------------------

function closePopups(ui, except) {
  if (except !== "icon") {
    feedPart(ui, "wrapper-icon-picker", []);
    ui._pickerOpen = 0;
  }
  if (except !== "cover") closeCoverPopup(ui);
}

function toggleIconPicker(ui) {
  if (ui._pickerOpen) return closePopups(ui);
  closePopups(ui, "icon");
  ui._pickerOpen = 1;
  ui._emojiTab = "search";
  ui._emojiQuery = "";
  feedPart(ui, "wrapper-icon-picker", require("./skeleton/emoji-picker")(ui, CATEGORIES)).then(
    (p) => {
      // Typing in the search field, caught where it bubbles to: the field is an
      // Entry, which builds its input after it reports itself ready.
      if (p && p.el && !p.el.dataset.searchWired) {
        p.el.dataset.searchWired = "1";
        p.el.addEventListener("input", (e) => {
          const input = e.target;
          if (!input || !input.closest || !input.closest(`.${ui.fig.family}__emoji-search`)) return;
          ui._emojiQuery = input.value || "";
          renderEmojis(ui);
        });
      }
      renderEmojis(ui);
      armOutsideClose(ui);
      const field = p && p.el && p.el.querySelector(`.${ui.fig.family}__emoji-search input`);
      if (field) field.focus();
    }
  );
}

/**
 * Fill the picker grid for the active tab or search.
 */
function renderEmojis(ui) {
  loadEmojiData()
    .then((data) => {
      if (!ui._pickerOpen) return;
      const native = (id) => {
        const e = data.emojis[id];
        return e && e.skins && e.skins[0] && e.skins[0].native;
      };
      const q = `${ui._emojiQuery || ""}`.trim().toLowerCase();
      let title;
      let list;
      if (q) {
        title = LOCALE.NOTE_EMOJI_RESULTS;
        list = [];
        for (const id of Object.keys(data.emojis)) {
          const e = data.emojis[id];
          const hay = [id, e.name || "", ...(e.keywords || [])].join(" ").toLowerCase();
          if (hay.includes(q)) {
            const n = native(id);
            if (n) list.push(n);
          }
          if (list.length >= SEARCH_MAX) break;
        }
      } else if (ui._emojiTab === "search") {
        title = LOCALE.NOTE_FREQUENTLY_USED;
        // History first, topped up with the first smileys so the grid is
        // always full (Figma draws four rows).
        const people = (data.categories || []).find((c) => c.id === "people");
        const fill = ((people && people.emojis) || []).map(native).filter(Boolean);
        list = [...new Set([...readRecent(), ...fill])].slice(0, RECENT_MAX);
      } else {
        const cat = CATEGORIES.find((c) => c.id === ui._emojiTab);
        const found = (data.categories || []).find((c) => c.id === ui._emojiTab);
        title = cat ? cat.label() : "";
        list = ((found && found.emojis) || []).map(native).filter(Boolean);
      }
      ui.ensurePart("emoji-section").then((p) => p && p.set && p.set({ content: title }));
      ui.ensurePart("emoji-grid").then((p) => {
        if (!p || !p.el) return;
        // Text nodes only — the emoji come from emoji-mart's data, and nothing
        // here is parsed as markup.
        p.el.textContent = "";
        for (const e of list) {
          const span = document.createElement("span");
          span.className = `${ui.fig.family}__emoji`;
          span.dataset.emoji = e;
          span.textContent = e;
          p.el.appendChild(span);
        }
        if (!list.length) {
          const none = document.createElement("span");
          none.className = `${ui.fig.family}__emoji-empty`;
          none.textContent = LOCALE.NO_RESULTS;
          p.el.appendChild(none);
        }
        p.el.scrollTop = 0;
      });
      ui.ensurePart("emoji-tabs").then((p) => {
        if (!p || !p.el) return;
        p.el.querySelectorAll("[data-tab]").forEach((b) => {
          b.dataset.active = b.dataset.tab === ui._emojiTab && !q ? "1" : "0";
        });
      });
    })
    .catch((e) => ui.warn("editor_blocknote: emoji data failed to load", e));
}

function pickEmoji(ui, emoji) {
  if (!emoji) return;
  writeRecent(emoji);
  closePopups(ui);
  ui.updatePage({ icon: emoji });
}

// ---------------------------------------------------------------------------
//  Cover
// ---------------------------------------------------------------------------

function openCoverPopup(ui) {
  if (ui._coverPopup) return closeCoverPopup(ui);
  closePopups(ui, "cover");
  ui._coverPopup = 1;
  feedPart(ui, "wrapper-cover-popup", require("./skeleton/cover-popup")(ui)).then(() => {
    armOutsideClose(ui);
    // Ctrl/Cmd + V while the popup is open pastes an image as the cover.
    ui._onPaste = (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const it of items) {
        if (it.kind === "file" && /^image\//.test(it.type)) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            e.stopPropagation();
            uploadCover(ui, file);
            return;
          }
        }
      }
    };
    document.addEventListener("paste", ui._onPaste, true);
  });
}

/**
 * The <input type=file> of the cover popup's FileSelector part, if it is up.
 * @param {View} part
 * @returns {HTMLInputElement|null}
 */
function coverInput(part) {
  if (!part || !part.el || (part.isDestroyed && part.isDestroyed())) return null;
  return part.el.tagName === "INPUT" ? part.el : part.el.querySelector("input[type=file]");
}

/**
 * Open the OS file picker for a cover — the same path as the folder's
 * "+ New → From device" (Wm.handleUpload): refuse while the org is read-only,
 * then FileSelector.open() inside the user's click. A browser opens its file
 * picker only during the gesture, and a click() deferred past it is dropped
 * without a word (Safari is the strictest), so this never waits on anything.
 *
 * A brand-new note has no node yet; it is saved once a file is picked, not
 * before the picker opens.
 * @param {View} ui
 */
function pickCoverFile(ui) {
  if (require("libs/over-limit").guardWrite("write")) return;
  const selector = ui.__fileselector;
  if (!coverInput(selector)) return;
  selector.open((e) => {
    const file = e.target && e.target.files && e.target.files[0];
    if (file) ui._withNode(() => uploadCover(ui, file));
  });
}

function closeCoverPopup(ui) {
  if (ui._onPaste) {
    document.removeEventListener("paste", ui._onPaste, true);
    ui._onPaste = null;
  }
  if (!ui._coverPopup) return;
  ui._coverPopup = 0;
  feedPart(ui, "wrapper-cover-popup", []);
}

/**
 * Upload the image next to the note, then make it the cover. The image is an
 * ordinary file in the note's folder — visible there, shareable, and removed
 * from the note (not from the folder) by Remove.
 * @param {View} ui
 * @param {File} file
 */
function uploadCover(ui, file) {
  if (!file || !/^image\//.test(file.type || "")) {
    Wm.alert(LOCALE.NOTE_COVER_NOT_IMAGE);
    return;
  }
  const dest = ui._saveTarget();
  if (!dest) return;
  closeCoverPopup(ui);
  showLocalCover(ui, file);
  // Until it lands the cover is not in the note: closing the window waits on
  // this (saveBeforeClose), or the cover went with the window.
  let landed;
  ui._coverUpload = new Promise((resolve) => (landed = resolve));
  const settle = () => {
    ui._coverUpload = null;
    landed();
  };
  ui._setStatus("saving");
  // The shared uploader, on a context of its own: called on the window it
  // would wire the window's upload hooks (onUploadEnd & co., which the MFS
  // base implements for a file tile) to a request that is not about it.
  const ctx = { get: () => null, verbose: () => {}, warn: (...a) => ui.warn(...a) };
  let xhr;
  try {
    xhr = uploadFile.call(ctx, file, { hub_id: dest.hub_id, nid: dest.pid });
  } catch (e) {
    ui.warn("editor_blocknote: cover upload did not start", e);
    xhr = null;
  }
  if (!xhr) {
    settle();
    dropLocalCover(ui);
    ui._setStatus(ui._changed ? "unsaved" : "saved");
    Wm.alert(LOCALE.NOTE_COVER_FAILED);
    return;
  }
  xhr.addEventListener("readystatechange", () => {
    if (xhr.readyState !== 4) return;
    let data = null;
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        data = JSON.parse(xhr.responseText).data;
      } catch (e) {
        data = null;
      }
    }
    const nid = data && (data.nid || data.id);
    if (!nid) {
      settle();
      dropLocalCover(ui);
      ui._setStatus(ui._changed ? "unsaved" : "saved");
      Wm.alert(LOCALE.NOTE_COVER_FAILED);
      return;
    }
    if (ui._localCover) ui._localCover.nid = `${nid}`;
    ui._reflectInTarget(dest.target, data, { adopt: false });
    ui.updatePage({ cover: { nid: `${nid}`, hub_id: `${data.hub_id || dest.hub_id}` } });
    settle();
  });
}

/**
 * Show the picked image as the cover at once, from the computer's own copy,
 * while it uploads. Without it the banner stayed empty for the whole upload,
 * then fetched back the very bytes just sent (a 4 MB PNG: ~10 s up, then
 * ~2-7 s down). The copy also serves the cover once uploaded (coverSrc), so
 * this session never downloads it; the next opening reads the server's.
 * @param {View} ui
 * @param {File} file
 */
function showLocalCover(ui, file) {
  dropLocalCover(ui, { repaint: false });
  ui._localCover = { url: URL.createObjectURL(file), nid: null };
  if (ui.el) ui.el.dataset.cover = "1";
  // No Change / Remove until the upload has made it a cover.
  paintSlot(ui, "page-cover", `local|${ui._localCover.url}`, () =>
    require("./skeleton/cover")(ui, { nid: null }, false)
  );
}

/**
 * Forget the local copy; repaint, unless asked not to, so a failed upload
 * puts back the cover the note had.
 * @param {View} ui
 * @param {{repaint?: Boolean}} [opt]
 */
function dropLocalCover(ui, opt = {}) {
  const local = ui._localCover;
  if (!local) return;
  ui._localCover = null;
  URL.revokeObjectURL(local.url);
  if (opt.repaint !== false) paint(ui);
}

/**
 * The image a cover shows: the local copy while it is being, or has just
 * been, uploaded in this window; the server's original otherwise.
 * @param {View} ui
 * @param {{nid: String, hub_id: String}} cover
 */
function coverSrc(ui, cover) {
  const local = ui._localCover;
  if (local && local.nid === cover.nid) return local.url;
  return coverUrl(cover);
}

/**
 * Where the cover image is read from: the ORIGINAL. The server's largest
 * rendition (`slide`) is 1024px wide, and the banner spans the window — it
 * came out visibly soft. The popup asks for images wider than 1500px for the
 * same reason.
 *
 * Built by the shared editor/content-url (the app's endpoint), never from
 * location: the app also answers at the bare host (`https://team.drumee.in/#…`,
 * no `/-/`) and with a query, and a location-built URL 404'd in both.
 */
function coverUrl(cover) {
  return require("../content-url").contentUrl(null, { nid: cover.nid, hub_id: cover.hub_id });
}

// ---------------------------------------------------------------------------
//  Comments — the note's own chat thread (channel.file_thread_*)
// ---------------------------------------------------------------------------

function loadComments(ui) {
  const nid = ui.mget(_a.nid);
  if (!nid || ui._commentsLoading) return;
  ui._commentsLoading = 1;
  ui.fetchService(threadSvc("messages"), {
    hub_id: ui.mget(_a.hub_id),
    file_nid: nid,
    order: "asc",
  })
    .then((data) => {
      ui._commentsLoading = 0;
      ui._commentsLoaded = 1;
      const list = Array.isArray(data) ? data : [];
      ui._comments = list.filter((m) => m && (m.message || m.message_id));
      if (ui._comments.length) paint(ui);
    })
    .catch((e) => {
      ui._commentsLoading = 0;
      ui._commentsLoaded = 1;
      ui.warn("editor_blocknote: comments failed to load", e);
    });
}

function commentEntry(ui) {
  return ui.ensurePart("comment-entry").then((p) => {
    const input = p && p.el && p.el.querySelector("input, textarea");
    return input || null;
  });
}

function postComment(ui) {
  if (ui._posting) return;
  commentEntry(ui).then((input) => {
    const text = input ? `${input.value || ""}`.trim() : "";
    if (!text) return;
    ui._withNode(() => {
      ui._posting = 1;
      ui.postService({
        service: threadSvc("post"),
        hub_id: ui.mget(_a.hub_id),
        file_nid: ui.mget(_a.nid),
        message: encodeMessage(text),
      })
        .then((data) => {
          ui._posting = 0;
          if (!data || (data.status && !data.message_id)) {
            Wm.alert(LOCALE.NOTE_COMMENT_FAILED);
            return;
          }
          if (input) input.value = "";
          ui._comments = [
            ...(ui._comments || []),
            { ...data, author_id: data.author_id || Visitor.id, message: data.message || encodeMessage(text) },
          ];
          ui._commentsOpen = 1;
          paint(ui);
        })
        .catch((e) => {
          ui._posting = 0;
          ui.warn("editor_blocknote: comment failed", e);
          Wm.alert(LOCALE.NOTE_COMMENT_FAILED);
        });
    });
  });
}

/**
 * Attachments and mentions are the chat's own tools; the paperclip and the @
 * open the note's chat thread, where they live, rather than rebuilding them.
 *
 * The folder window scopes its chat to the file it is handed — so it is handed
 * the NOTE's node (it reads the nid off it), not the button. That chat sits
 * behind this docked editor, so the editor closes (saving, like any close) to
 * show it; the thread's own "Open file" brings the note back.
 */
function openThread(ui) {
  ui._withNode(() => {
    const media = ui.media;
    if (!media || media.isDestroyed() || !_.isFunction(media.onUiEvent)) {
      Wm.alert(LOCALE.NOTE_COMMENT_FAILED);
      return;
    }
    media.onUiEvent(media, { service: _a.chat });
    ui.goodbye();
  });
}

// ---------------------------------------------------------------------------
//  Popup housekeeping
// ---------------------------------------------------------------------------

/**
 * A click outside an open popup, or Escape, closes it.
 */
function armOutsideClose(ui) {
  disarmOutsideClose(ui);
  ui._onOutside = (e) => {
    if (e.type === "keydown") {
      if (e.key === "Escape") closePopups(ui);
      return;
    }
    const inside = e.target.closest && e.target.closest(
      `.${ui.fig.family}__popup, .${ui.fig.family}__page-icon, .${ui.fig.family}__cover-controls, .${ui.fig.family}__page-action`
    );
    if (!inside) closePopups(ui);
  };
  setTimeout(() => {
    document.addEventListener("mousedown", ui._onOutside, true);
    document.addEventListener("keydown", ui._onOutside, true);
  }, 0);
}

function disarmOutsideClose(ui) {
  if (!ui._onOutside) return;
  document.removeEventListener("mousedown", ui._onOutside, true);
  document.removeEventListener("keydown", ui._onOutside, true);
  ui._onOutside = null;
}

// ---------------------------------------------------------------------------
//  Wiring
// ---------------------------------------------------------------------------

/**
 * @returns {Boolean} whether the part was one of ours
 */
function onPartReady(ui, child, pn) {
  switch (pn) {
    case "page-actions":
    case "page-icon":
    case "page-cover":
    case "page-comments":
      if (ui._painted) delete ui._painted[pn];
      paint(ui);
      return true;

    case "emoji-grid":
      child.el.addEventListener("click", (e) => {
        const t = e.target.closest && e.target.closest("[data-emoji]");
        if (t) pickEmoji(ui, t.dataset.emoji);
      });
      return true;

    // The cover's file input (skeleton/index). The name is ui-core's, not
    // ours: the FileSelector skeleton overwrites sys_pn with it. Nothing to
    // wire — pickCoverFile hands the picked file over through open().
    case "fileselector":
      return true;

    case "comment-entry":
      return true;

    default:
      return false;
  }
}

/**
 * @returns {Boolean} whether the service was one of ours
 */
function onUiEvent(ui, cmd, service) {
  switch (service) {
    // Add icon puts an emoji on the page at once and opens the picker on it,
    // so the choice is a change of mind, not a blank to fill (Figma 1406:27172).
    case "add-icon":
      if (!ui.canEditNote()) return true;
      loadEmojiData()
        .then((data) => {
          const people = (data.categories || []).find((c) => c.id === "people");
          const ids = ((people && people.emojis) || []).slice(0, 80);
          const id = ids[Math.floor(Math.random() * ids.length)];
          const e = id && data.emojis[id];
          const native = e && e.skins && e.skins[0] && e.skins[0].native;
          if (native) ui.updatePage({ icon: native });
          if (!ui._pickerOpen) toggleIconPicker(ui);
        })
        .catch((e) => ui.warn("editor_blocknote: emoji data failed to load", e));
      return true;

    case "toggle-icon-picker":
      if (ui.canEditNote()) toggleIconPicker(ui);
      return true;

    case "remove-icon":
      closePopups(ui);
      ui.updatePage({ icon: "" });
      return true;

    case "emoji-tab":
      ui._emojiTab = cmd.mget("tab") || "search";
      ui._emojiQuery = "";
      ui.ensurePart("emoji-search").then((p) => {
        const input = p && p.el && (p.el.querySelector("input") || p.el);
        if (input) input.value = "";
      });
      renderEmojis(ui);
      return true;

    // Add cover goes straight to the file picker, like "+ New → From device";
    // the popup (paste, size hint) is kept for changing a cover already there.
    case "add-cover":
      if (!ui.canEditNote()) return true;
      closePopups(ui);
      pickCoverFile(ui);
      return true;

    case "change-cover":
      if (ui.canEditNote()) ui._withNode(() => openCoverPopup(ui));
      return true;

    case "remove-cover":
      closePopups(ui);
      ui.updatePage({ cover: null });
      return true;

    // The popup's Upload: the same picker, synchronously inside the click.
    case "pick-cover-file":
      pickCoverFile(ui);
      return true;

    case "add-comment":
      ui._commentsOpen = 1;
      paint(ui);
      commentEntry(ui).then((input) => input && input.focus());
      return true;

    case "post-comment":
      postComment(ui);
      return true;

    case "comment-attach":
    case "comment-mention":
      openThread(ui);
      return true;

    default:
      return false;
  }
}

function destroy(ui) {
  disarmOutsideClose(ui);
  closeCoverPopup(ui);
  dropLocalCover(ui, { repaint: false });
}

module.exports = { paint, onPartReady, onUiEvent, destroy, coverUrl, coverSrc, plainText };

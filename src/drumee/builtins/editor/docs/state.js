import { createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { DocxEditor } from "@casualoffice/docs/react";
import { CasualEditor } from "@casualoffice/docs";
import { serializeDocx } from "@casualoffice/docs/core";
import "@casualoffice/docs/styles.css";
import { contentUrl } from "builtins/editor/content-url";
const docTabs = require("./tabs");

// Co-editing helpers: gateway probe, Drumee FileSource adapter, identity.
const collab = require("./collab");

// A guaranteed-valid minimal blank .docx (OOXML: [Content_Types], _rels, an empty
// word/document.xml). NEW docs mount through the same documentBuffer path an
// existing file uses — that path settles the editor's isLoading so onReady/
// onChange fire (the `document` prop path leaves isLoading stuck true).
const BLANK_DOCX_B64 =
  "UEsDBBQAAAAIACGULl0XmADX6wAAALIBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU4DMQy98xWRr2gmAweEUKc9sByBQ/kAK/HMRM2mOC3t3+NpoQdUONpvs99itQ9e7aiwS7GHm7YDRdEk6+LYw8f6pbkHxRWjRZ8i9XAghtXyarE+ZGIl4sg9TLXmB63ZTBSQ25QpCjKkErDKWEad0WxwJH3bdXfapFgp1qbOHiBmTzTg1lf1vJf96ZJCnkE9nphzWA+Ys3cGq+B6F+2vmOY7ohXlkcOTy3wtBNCXI2bo74Qf4ZuUU5wl9Y6lvmIQmv5MxWqbzDaItP3f58KlaRicobN+dsslGWKW1oNvz0hAF88f6GPlyy9QSwMEFAAAAAgAIZQuXT+t/vqvAAAALAEAAAsAAABfcmVscy8ucmVsc43POw7CMAwA0J1TRN5pWgaEUEMXhNQVlQNEiZtWNB/F4dPbk4EBKgZG/57tunnaid0x0uidgKoogaFTXo/OCLh0p/UOGCXptJy8QwEzEjSHVX3GSaY8Q8MYiGXEkYAhpbDnnNSAVlLhA7pc6X20MuUwGh6kukqDfFOWWx4/DVigrNUCYqsrYN0c8B/c9/2o8OjVzaJLP3YsOrIso8Ek4OGj5vqdLjILPJ/Dv548vABQSwMEFAAAAAgAIZQuXRPKAbPbAAAAXAEAABEAAAB3b3JkL2RvY3VtZW50LnhtbE2QwW7DIBBE7/0KxL3BsdI2skJy6y1SpbYfQMwaLBkWwSY0/fpSXNU+MW9ntTPicPpyE7tBTCN6ybebhjPwPerRG8k/P14f95wlUl6rCT1IfofET8eHQ+409lcHnli54FOXJbdEoRMi9RacShsM4Is3YHSKCkYjMkYdIvaQUglwk2ib5lk4NXpeb15Q36sIoj4JenqL88S8f7P8G7Nt212pmTtb9NO+aPG3cVaxjAlDMXbzThyNpQUvSIRu4QmGlWtBaYiSv7QVB0RaoblSxTlPrNqJ/+Zi+ZfjD1BLAQIUAxQAAAAIACGULl0XmADX6wAAALIBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAIZQuXT+t/vqvAAAALAEAAAsAAAAAAAAAAAAAAIABHAEAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAIZQuXRPKAbPbAAAAXAEAABEAAAAAAAAAAAAAAIAB9AEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAAP4CAAAAAA==";

// The Drumee player window sets user-select:none (drag chrome); re-enable it for
// the editor subtree so ProseMirror accepts input. Reused from the sheet skin.
require("./skin");

/** ArrayBuffer ↔ base64 — the .docx is stored base64-in-JSON so it round-trips
 *  through media.save's text `content` (the same reliable path the sheet uses),
 *  avoiding a separate binary-upload endpoint. */
function abToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function base64ToAb(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

class __docs_state extends DrumeeMFS {
  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.media = opt.media;
    this.editor = opt.editor;
    this.escapeContextmenu = true;
    if (this.media) {
      let { nid, pid, hub_id } = this.media.actualNode();
      this.mset({ nid, pid, hub_id });
    }
    // A NEW doc is created on Drumee BEFORE it is fed here (editor_docs
    // `_createBlankNode`), so it already has a nid — i.e. a collab room.
    if (opt.nid) this.mset({ nid: opt.nid, hub_id: opt.hub_id, pid: opt.pid });
  }

  /**
   *
   */
  onDomRefresh() {
    if (this._mounted) return;
    this.containerId = `${this.mget(_a.widgetId)}-docs-state`;
    this.el.setAttribute(_a.id, this.containerId);
    // Co-editing when the gateway answers: the room is the nid, CasualEditor
    // loads/saves through the Drumee FileSource. Otherwise the single-user
    // DocxEditor path below (identical to before the gateway existed).
    const nid = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);
    if (nid && hub_id) {
      collab.gatewayUp().then((up) => {
        if (this._destroyed || this._mounted) return;
        if (up) {
          this._collab = { nid, hub_id };
          this.mount(null);
        } else {
          console.warn("[DOCS] collab gateway down → single-user editor");
          this._loadSingleUser();
        }
      });
      return;
    }
    this._loadSingleUser();
  }

  /**
   * Single-user path: fetch the .udoc bytes (or start blank) and mount the
   * plain DocxEditor.
   */
  _loadSingleUser() {
    if (!this.media) {
      this._mountBlank();
      return;
    }
    this.media.wait(0);
    // ui-core's derivation (share key for dmz visitors, cache buster) — see
    // builtins/editor/content-url.
    const url = contentUrl(this.media, {
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
    });
    if (!url) {
      this._mountBlank();
      return;
    }
    // `cache: "no-cache"` (revalidate with the ETag), NOT a plain GET: nginx
    // serves /file/orig/… with Cache-Control max-age of a year, so a plain
    // request returned the FIRST version the browser ever saw — the blank
    // document a new file starts as — and every later open read stale bytes.
    fetch(url, { credentials: "include", cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`content fetch failed: ${r.status}`);
        return r.text();
      })
      .then((content) => {
        let buffer = null;
        try {
          const j = JSON.parse(content);
          // Document tabs: hand the list to the window (which owns it) and
          // mount the active one. A file written before tabs existed yields a
          // single tab holding its `docx` — see docs/tabs.js readTabs.
          const model = docTabs.readTabs(j, BLANK_DOCX_B64);
          if (this.editor && this.editor.setTabs) this.editor.setTabs(model.tabs, model.active);
          const cur = model.tabs.find((t) => t.id === model.active) || model.tabs[0];
          if (cur && cur.docx) buffer = base64ToAb(cur.docx);
        } catch (e) {
          this.warn("docs_state: unreadable document, starting blank", e);
        }
        if (buffer) this.mount(buffer);
        else this._mountBlank();
      })
      .catch((e) => {
        this.warn("docs_state: load failed, starting blank", e);
        this._mountBlank();
      });
  }

  /**
   * A NEW doc has no bytes. Passing the `document` prop leaves the editor's
   * internal isLoading stuck true (onReady/onChange never fire), so instead we
   * serialize a blank Document to real .docx BYTES and mount through the same
   * buffer path an existing file uses — that path settles isLoading → false.
   */
  _mountBlank() {
    // A brand-new document still gets a tab model, so the rail shows "Tab 1"
    // from the start and "+" has something to append to.
    if (this.editor && this.editor.setTabs && !(this.editor.getTabs() || []).length) {
      const seed = docTabs.readTabs(null, null);
      this.editor.setTabs(seed.tabs, seed.active);
    }
    let buffer = null;
    try {
      buffer = base64ToAb(BLANK_DOCX_B64);
    } catch (e) {
      console.error("[DOCS] _mountBlank decode failed", e && e.message);
    }
    console.log("[DOCS] _mountBlank blank bytes=", buffer && buffer.byteLength);
    this.mount(buffer);
  }

  /**
   * @param {ArrayBuffer|null} buffer initial .docx bytes
   */
  mount(buffer) {
    this._pendingBuffer = buffer;
    this._mountWhenSized();
  }

  /**
   *
   */
  _mountWhenSized() {
    let tries = 0;
    const go = () => {
      if (this._destroyed || !this.el) return;
      const r = this.el.getBoundingClientRect();
      if ((r.height > 120 && r.width > 200) || tries > 40) {
        this._doMount();
        return;
      }
      tries++;
      setTimeout(go, 80);
    };
    go();
  }

  /**
   *
   */
  _doMount() {
    if (this._mounted || this._destroyed || !this.el) return;
    this._mounted = 1;
    if (this._collab) return this._doMountCollab();
    this._loading = 1;
    console.log("[DOCS] _doMount start, hasBuffer=", !!this._pendingBuffer);
    setTimeout(() => {
      this._loading = 0;
    }, 1500);

    const onChange = (doc) => {
      if (doc) this._currentDoc = doc;
      if (!this._chLogged) {
        this._chLogged = 1;
        console.log("[DOCS] first onChange, doc=", !!doc);
      }
      if (this._loading) return;
      if (this.editor) {
        this.editor._changed = 1;
        // Flip the header label to "Unsaved changes" until the next save.
        if (this.editor.markDirty) this.editor.markDirty();
      }
      scheduleIdleSave();
    };
    // Google-Docs style autosave: persist once the user PAUSES (3s after the
    // last edit), never in the middle of typing. Each edit pushes the timer.
    const scheduleIdleSave = () => {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        if (this._destroyed || !this.editor) return;
        if (this.editor._changed && typeof this.editor.saveContent === "function") {
          this.editor.saveContent();
        }
      }, 3000);
    };
    const onSave = (bytes) => {
      // Casual calls onSave(bytes) from EVERY internal .docx export: File→Save
      // and Ctrl+S, but ALSO its own 30s local-draft timer that runs while the
      // document is dirty (that was the "it randomly saves by itself" the
      // user saw, and the old 4s coalescing turned each one into a Drumee
      // save + label flip). Persist only when there are unsaved edits, and
      // reuse the bytes it just exported instead of exporting a second time.
      // NOTE our own getContent() → exportDocx() runs through the same
      // export, so onSave also fires DURING our save — that fed the old
      // every-4s save loop. Ignore it while a save is in flight.
      if (!this.editor || !this.editor._changed || this.editor._saving) return;
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      if (typeof this.editor.saveContent === "function") this.editor.saveContent({ bytes });
    };

    // Always the .docx BYTES path (documentBuffer) — new docs get an embedded
    // blank .docx, existing docs their saved bytes. This settles the editor's
    // isLoading so onReady/onChange fire.
    const docProps = { documentBuffer: this._pendingBuffer };

    this._ref = createRef();
    window.__casualDocsRef = () => this._ref && this._ref.current;

    this._docName =
      (this.editor && this.editor.mget(_a.filename)) ||
      this.mget(_a.filename) ||
      LOCALE.UNTITLED_DOCUMENT;
    this._pinCasualTheme();
    this._root = createRoot(this._reactHost());
    // Kept as a closure so setDocumentName() can re-render with a new
    // (controlled) `documentName` without remounting the editor.
    const renderSingle = () => this._root.render(
      createElement(DocxEditor, {
        ref: this._ref,
        ...docProps,
        // Match the docs.casualoffice.org demo: show the horizontal ruler.
        // `features.ruler` can only HIDE it (omitted keys default to enabled);
        // visibility is `showRuler` (default false — deprecated name, still
        // honored in 1.4.2).
        showRuler: true,
        // Casual's own title bar (logo + inline-editable name + menu row) —
        // the demo header. Renames go to media.rename via the host window.
        documentName: this._docName,
        documentNameEditable: true,
        onDocumentNameChange: (name) => {
          if (this.editor && this.editor.renameFromCasual) this.editor.renameFromCasual(name);
        },
        onReady: (api) => {
          console.log("[DOCS] onReady fired, api keys=",
            api ? Object.keys(api).filter((k) => typeof api[k] === "function").length : "null");
          this._apiHandle = api;
          this._nudgeResize();
          // The editor is now fully mounted — make sure the window sits
          // above the desk's Files folder (see editor._raiseAboveDesk).
          if (this.editor && this.editor._raiseAboveDesk) this.editor._raiseAboveDesk();
          // "Help" stays visible; the host window reroutes its click to
          // Drumee support (editor._wireHotkeys). _hideCasualHelp() is kept
          // for the day the menu should disappear entirely.
        },
        onChange,
        onSave,
        // Casual's Help → "Report issue" goes to Drumee support too.
        onReportBug: () => {
          if (this.editor && this.editor.contactSupport) this.editor.contactSupport();
        },
        onError: (e) =>
          console.error("[DOCS] onError", e && (e.message || e), e && e.stack),
        author:
          (typeof Visitor !== "undefined" &&
            Visitor.get &&
            (Visitor.get("firstname") || Visitor.get("ident"))) ||
          "User",
      })
    );
    this._renderSingle = renderSingle;
    renderSingle();

    this.el.addEventListener("contextmenu", (e) => e.stopPropagation(), false);
    this._nudgeResize();
    /** POC debug handle */
    window.__casualDocsAPI = () => this._apiHandle;
  }

  /**
   * Re-render the single-user editor with a new controlled document name
   * (after a rename round-trip). No-op in collab mode, where CasualEditor
   * owns the name via fileSource.rename.
   */
  /**
   * React must NOT mount on this view's own element. ui-core installs
   * `el.onclick = View.__handleClick` on every active view, and that handler
   * calls stopPropagation() AND stopImmediatePropagation() on each click —
   * only a second click within 300ms (its double-click suppression window)
   * slips through. React 18 attaches its root listeners to the container,
   * i.e. that same element, and later than ui-core, so EVERY Casual onClick
   * (toolbar, bubble bar, menus) was swallowed on the first press — the
   * "bấm mấy lần mới ăn" bug. Mounting on a child host puts React's listener
   * one level BELOW the view el, so it runs before ui-core's.
   */
  /**
   * Casual's DocxEditor stamps `data-theme` (and `data-app="docs"`) on <html>
   * when it mounts, resolved from its own localStorage key
   * `casual-editor:color-theme` (default "auto" = the OS prefers-color-scheme,
   * plus a live OS listener). Drumee keys its GLOBAL theme on that very
   * attribute, so on a dark-mode machine opening a doc turned the whole desk
   * dark. There is no prop to switch it off, so pin Casual's choice to
   * Drumee's current theme: its write becomes a no-op and, not being "auto",
   * it installs no OS listener.
   */
  /**
   * Hide Casual's "Help" menubar menu (Report issue / About Casual Editor /
   * shortcuts): Drumee's gear menu offers "Contact us" instead. DocxEditor
   * exposes no prop for it, so hide the menu's wrapper after each render (a
   * subtree observer re-applies it when Casual re-renders the menubar).
   */
  _hideCasualHelp() {
    const root = this.el;
    if (!root) return;
    const hide = () => {
      try {
        for (const b of root.querySelectorAll('button[aria-haspopup="menu"]')) {
          if (b.textContent.trim() !== "Help") continue;
          const wrap = b.parentElement || b;
          if (wrap.style.display !== "none") wrap.style.display = "none";
        }
      } catch (e) {
        /** editor gone */
      }
    };
    hide();
    if (!this._helpObs) {
      this._helpObs = new MutationObserver(() => {
        clearTimeout(this._helpTimer);
        this._helpTimer = setTimeout(hide, 50);
      });
      this._helpObs.observe(root, { childList: true, subtree: true });
    }
  }

  /**
   * Co-editing shell clean-up: Casual's "Share" (links to Casual's own room
   * URLs, not Drumee sharing) and its theme toggle (writes `data-theme` on
   * <html>, i.e. the whole desk) have no place inside Drumee — hide both.
   * Re-applied on every collab state change and via a subtree observer,
   * since Casual re-renders that cluster with presence updates.
   */
  _tidyCollabChrome() {
    const root = this.el;
    if (!root) return;
    const editor = this.editor;
    const tidy = () => {
      try {
        for (const b of root.querySelectorAll('button[aria-label^="Theme:"], button[aria-label^="Theme "]')) {
          b.style.display = "none";
        }
        const cluster = root.querySelector('[data-testid="presence-cluster"]');
        if (cluster) {
          for (const b of cluster.querySelectorAll("button")) {
            if (/share/i.test(b.textContent || "")) b.style.display = "none";
          }
          // Click on the avatars → list who is in the document (Casual only
          // offers a hover tooltip per avatar).
          const avatars = cluster.firstElementChild;
          if (avatars && !avatars.__peersWired) {
            avatars.__peersWired = 1;
            avatars.style.cursor = "pointer";
            avatars.addEventListener("click", (e) => {
              e.stopPropagation();
              this._togglePeersPopover(avatars);
            });
          }
        }
        // CasualEditor ignores documentName*: add Drumee's own editable name
        // at the left of Casual's title row (menus shift right).
        const bar = root.querySelector('[data-testid="title-bar"]');
        if (bar && editor) {
          let box = this._nameBox;
          if (!box) {
            box = document.createElement("div");
            box.className = "editor-docs__collab-name";
            const input = document.createElement("input");
            input.type = "text";
            input.setAttribute("aria-label", "Document name");
            input.value = editor.mget(_a.filename) || "";
            input.addEventListener("keydown", (ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                input.blur();
              }
              if (ev.key === "Escape") {
                input.value = editor.mget(_a.filename) || "";
                input.blur();
              }
              ev.stopPropagation();
            });
            input.addEventListener("change", () => {
              const name = input.value.trim();
              if (name && name !== editor.mget(_a.filename) && editor.renameFromCasual) {
                editor.renameFromCasual(name);
                if (editor._commitRename) editor._commitRename();
              }
            });
            box.appendChild(input);
            this._nameBox = box;
          }
          if (box.parentElement !== bar) bar.insertBefore(box, bar.firstChild);
          const input = box.querySelector("input");
          if (input && document.activeElement !== input) {
            const cur = editor.mget(_a.filename) || "";
            if (input.value !== cur) input.value = cur;
          }
        }
      } catch (e) {
        /** editor gone */
      }
    };
    tidy();
    if (!this._tidyObs) {
      this._tidyObs = new MutationObserver(() => {
        clearTimeout(this._tidyTimer);
        this._tidyTimer = setTimeout(tidy, 80);
      });
      this._tidyObs.observe(root, { childList: true, subtree: true });
    }
  }

  /**
   * Small popover under the presence avatars listing everyone in the room.
   */
  _togglePeersPopover(anchor) {
    const old = this._peersPop;
    if (old) {
      old.remove();
      this._peersPop = null;
      document.removeEventListener("pointerdown", this._peersPopOutside, true);
      return;
    }
    const peers = (this._collabState && this._collabState.peers) || [];
    const pop = document.createElement("div");
    pop.className = "editor-docs__peers-pop";
    const title = document.createElement("div");
    title.className = "editor-docs__peers-title";
    title.textContent = `${LOCALE.ONLINE || "Online"} (${peers.length})`;
    pop.appendChild(title);
    for (const p of peers) {
      const row = document.createElement("div");
      row.className = "editor-docs__peers-row";
      const dot = document.createElement("span");
      dot.className = "editor-docs__peers-dot";
      dot.style.background = p.color || "#888";
      const name = document.createElement("span");
      name.textContent = p.isLocal ? `${p.name} (${LOCALE.YOU || "you"})` : p.name;
      row.appendChild(dot);
      row.appendChild(name);
      pop.appendChild(row);
    }
    const host = this.editor && this.editor.el ? this.editor.el : this.el;
    const hr = host.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    pop.style.top = `${Math.round(ar.bottom - hr.top + 6)}px`;
    pop.style.right = `${Math.round(hr.right - ar.right)}px`;
    host.appendChild(pop);
    this._peersPop = pop;
    this._peersPopOutside = (e) => {
      if (!pop.contains(e.target) && !anchor.contains(e.target)) this._togglePeersPopover(anchor);
    };
    document.addEventListener("pointerdown", this._peersPopOutside, true);
  }

  _pinCasualTheme() {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    try {
      localStorage.setItem("casual-editor:color-theme", theme);
    } catch (e) {
      /** storage unavailable — Casual falls back to "auto" */
    }
    return theme;
  }

  _reactHost() {
    if (this._host && this._host.isConnected) return this._host;
    const host = document.createElement("div");
    host.className = "docs-state__react-host";
    // FIRST child: Skeletons already put a 100%-tall `widget-blank`
    // placeholder in this el; appended after it, the host landed below the
    // visible area and the new-doc window looked empty.
    this.el.insertBefore(host, this.el.firstChild);
    this._host = host;
    // The window's "Loading…" label (docs/skeleton) has done its job.
    const win = this.el.closest(".editor-docs");
    const loading = win && win.querySelector(".editor-loading");
    if (loading) loading.remove();
    return host;
  }

  setDocumentName(name) {
    // Empty string is a valid transient value (the user cleared the field).
    if (name == null || this._collab || !this._renderSingle) return;
    this._docName = String(name);
    try {
      this._renderSingle();
    } catch (e) {
      /** editor gone */
    }
  }

  /**
   * Co-editing mount: `<CasualEditor>` (editor + Hocuspocus/Yjs session +
   * live comments/presence + autosave) driven by the Drumee FileSource.
   * docId = nid, so everyone who opens this file joins the same room; the
   * first peer seeds it with the bytes FileSource.open() returns.
   */
  _doMountCollab() {
    const { nid, hub_id } = this._collab;
    const editor = this.editor;
    const ctx = {
      hub_id,
      pid: this.mget(_a.pid) || (editor && editor.mget(_a.pid)),
      filename: () =>
        (editor && editor.mget(_a.filename)) || this.mget(_a.filename) || "Untitled document",
    };
    const fileSource = collab.makeFileSource(editor, ctx);
    // Kept so flushCollabSave() can push bytes through the very same adapter
    // the autosave uses when Casual exposes no flush handle.
    this._fileSource = fileSource;
    const user = collab.userIdentity();
    const { ws } = collab.bases();
    console.log("[DOCS] collab mount room=", nid, "ws=", ws, "user=", user.name);

    const mapStatus = (s) => {
      const v = String((s && s.status) || "").toLowerCase();
      if (/saving/.test(v)) return "saving";
      if (/error|fail|dirty|pending|unsaved/.test(v)) return "unsaved";
      return "saved";
    };

    window.__casualDocsRef = () => this._ref && this._ref.current;
    window.__collabState = () => this._collabState;

    this._pinCasualTheme();
    if (editor && editor.el) editor.el.classList.add("editor-docs--collab");

    // ONE EDITOR PER TAB, kept alive and hidden.
    //
    // Re-rendering a single editor with another `docId` tore the whole
    // editor down and reconnected its session on every switch: a second and
    // a half of blank page, every time. A tab already visited keeps its own
    // mounted editor here, so going back to it is a style change — instant,
    // with the caret, scroll position and session intact. Only the first
    // visit to a tab pays for a mount, and at most MAX_LIVE_TABS of them are
    // kept (the least recently used is dropped) so a long document with many
    // tabs cannot pile up sessions.
    const MAX_LIVE_TABS = 3;
    this._panes = new Map();
    this._paneOrder = [];

    const paneFor = (room) => {
      let pane = this._panes.get(room);
      if (pane) return pane;
      const host = document.createElement("div");
      host.className = "docs-state__react-host";
      this.el.insertBefore(host, this.el.firstChild);
      pane = { host, root: createRoot(host), ref: createRef(), rendered: false };
      this._panes.set(room, pane);
      return pane;
    };

    const prunePanes = () => {
      while (this._paneOrder.length > MAX_LIVE_TABS) {
        const room = this._paneOrder.shift();
        if (room === this._room) continue;
        const pane = this._panes.get(room);
        if (!pane) continue;
        this._panes.delete(room);
        try {
          pane.root.unmount();
          pane.host.remove();
        } catch (e) {
          /** already gone */
        }
      }
    };

    const renderCollab = (room) => {
      const previous = this._room;
      if (previous && previous !== room) {
        const old = this._panes.get(previous);
        if (old) old.host.style.display = "none";
      }
      this._room = room;
      this._paneOrder = this._paneOrder.filter((r) => r !== room).concat([room]);
      const pane = paneFor(room);
      pane.host.style.display = "";
      // Everything that exports or saves reads the ACTIVE tab's editor.
      this._ref = pane.ref;
      if (pane.rendered) {
        // Already mounted: nothing to load, nothing to cover.
        this._veil(false);
        this._nudgeResize();
        prunePanes();
        return;
      }
      pane.rendered = true;
      prunePanes();
      pane.root.render(
      createElement(CasualEditor, {
        ref: pane.ref,
        fileSource,
        docId: room,
        backendUrl: ws,
        user,
        author: user.name,
        autosave: true,
        autosaveInterval: 4000,
        // File → Save / Ctrl+S inside Casual: with no onSave prop the shell
        // DOWNLOADS a .docx; route it to Drumee's save (autosave flush).
        onSave: () => {
          if (room !== this._room) return;
          if (editor && typeof editor.saveContent === "function") editor.saveContent();
        },
        showRuler: true,
        // Hidden tabs keep running, so every callback belongs to ONE room and
        // is ignored unless that room is the one on screen — otherwise a
        // background tab's autosave would drive the header's status label and
        // its peers would show in the presence cluster.
        onAutosaveState: (state) => {
          if (room !== this._room) return;
          this._autosave = state;
          if (editor && editor.setSaveStatus) editor.setSaveStatus(mapStatus(state));
        },
        onCollabState: (state) => {
          if (room !== this._room) return;
          this._collabState = state;
          if (state && state.status === "connected" && !this._raisedOnce) {
            this._raisedOnce = 1;
            this._nudgeResize();
            if (editor && editor._raiseAboveDesk) editor._raiseAboveDesk();
          }
          this._tidyCollabChrome();
          if (editor && editor.setPeers) editor.setPeers(state ? state.peers : []);
        },
        onError: (e) =>
          console.error("[DOCS] collab onError", e && (e.message || e), e && e.stack),
      })
      );
    };
    this._renderCollab = renderCollab;
    renderCollab(nid);

    this.el.addEventListener("contextmenu", (e) => e.stopPropagation(), false);
    this._nudgeResize();
    if (editor && editor._raiseAboveDesk) setTimeout(() => editor._raiseAboveDesk(), 1200);
  }

  /**
   * Put a tab on screen.
   *
   * SINGLE-USER: load the tab's bytes into the mounted editor.
   * CO-EDITING: each tab is its own Yjs room, so the editor is re-rendered
   * with that room's `docId`; the FileSource then opens the tab's bytes and
   * seeds the room (collab.js maps `<nid>~<tabId>` back to the tab).
   *
   * @param {String} tabId
   */
  async showTab(tabId) {
    const editor = this.editor;
    const tabs = (editor && editor.getTabs && editor.getTabs()) || [];
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (this._collab) {
      const room = docTabs.roomId(this._collab.nid, tabs, tabId);
      // A tab visited before has its editor still mounted: showing it is a
      // style change, so no cover. Only a first visit mounts — and that gap
      // is what used to read as a white flash.
      const known = this._panes && this._panes.get(room);
      if (!known || !known.rendered) this._veil(true);
      if (this._renderCollab) this._renderCollab(room);
      return;
    }
    const ref = this._ref && this._ref.current;
    const bytes = tab.docx ? base64ToAb(tab.docx) : base64ToAb(BLANK_DOCX_B64);
    if (ref && typeof ref.loadDocumentBuffer === "function") {
      this._loading = 1;
      await ref.loadDocumentBuffer(bytes);
      setTimeout(() => {
        this._loading = 0;
      }, 800);
      return;
    }
    // No imperative loader (older build): remount on the new bytes.
    if (this._root) this._root.unmount();
    this._mounted = 0;
    this.mount(bytes);
  }

  /**
   * Show / hide the cover that hides the editor's remount during a tab
   * switch. Always lifted by a timer as well: a room that never reports
   * itself connected must not leave the document behind a curtain.
   *
   * @param {Boolean} on
   */
  _veil(on) {
    const el = this.editor && this.editor.el;
    if (!el) return;
    clearInterval(this._veilPoll);
    if (!on) {
      delete el.dataset.tabSwitching;
      return;
    }
    el.dataset.tabSwitching = "1";
    // Lifted when the PAGE IS BACK, not when the session reports itself
    // connected: on a re-render the collab state still carries the previous
    // room's "connected" and lifted the cover while the editor was still
    // being torn down — the flash was visible again. Capped at 6s so a room
    // that never comes up cannot leave the document hidden.
    const started = Date.now();
    this._veilPoll = setInterval(() => {
      const gone = this._destroyed || !this.editor || !this.editor.el;
      const pages = !gone && this.editor.el.querySelector(".paged-editor__pages");
      const ready = pages && pages.getBoundingClientRect().height > 40;
      if (gone || ready || Date.now() - started > 6000) {
        clearInterval(this._veilPoll);
        if (!gone) delete this.editor.el.dataset.tabSwitching;
      }
    }, 120);
  }

  /**
   * Join the room of the tab the file was last left on.
   *
   * The co-editing mount always starts in the file's ORIGINAL room (the
   * primary tab) because that is the only name known before the tab list has
   * been read. When the saved active tab is a different one, the rail lit
   * that tab while the editor still showed the primary tab's text. Runs once,
   * as soon as the list arrives.
   */
  ensureRoomForActive() {
    if (!this._collab || this._roomSynced) return;
    const editor = this.editor;
    const tabs = (editor && editor.getTabs && editor.getTabs()) || [];
    const active = editor && editor.activeTabId && editor.activeTabId();
    if (!tabs.length || !active) return;
    this._roomSynced = 1;
    const want = docTabs.roomId(this._collab.nid, tabs, active);
    if (this._room && want !== this._room) this.showTab(active);
  }

  /** The editor handle of the tab currently on screen. */
  currentRef() {
    return (this._ref && this._ref.current) || null;
  }

  /**
   * Export a specific editor — the one a tab was left on, which keeps running
   * after the switch, so its bytes can be taken once the new tab is already
   * up rather than before it opens.
   *
   * @param {Object} ref
   * @returns {Promise<String|null>} base64
   */
  async exportFrom(ref) {
    try {
      if (ref && typeof ref.exportDocx === "function") {
        const buf = await ref.exportDocx();
        if (buf) return abToBase64(buf);
      }
    } catch (e) {
      this.warn("docs_state: exportFrom failed", e);
    }
    return null;
  }

  /**
   * @returns {Promise<String|null>} base64 of what is on screen right now —
   * used to keep the tab being left before another is loaded.
   */
  async exportCurrent() {
    try {
      const ref = this._ref && this._ref.current;
      if (ref && typeof ref.exportDocx === "function") {
        const buf = await ref.exportDocx();
        if (buf) return abToBase64(buf);
      }
    } catch (e) {
      this.warn("docs_state: exportCurrent failed", e);
    }
    return this.getContent();
  }

  /**
   * Ctrl+S / Save button in co-editing mode: force the CasualEditor autosave
   * to flush through FileSource.save (→ media.save) right now.
   */
  async flushCollabSave() {
    if (!this._collab) return null;
    const ref = this._ref && this._ref.current;
    // `flushSave()` is CasualEditorRef's documented force-save (the SDK's own
    // "Save & close" hook); `_autosave.flush()` is the same thing reached
    // through the state object onAutosaveState hands us.
    if (ref && typeof ref.flushSave === "function") return ref.flushSave();
    const a = this._autosave;
    if (a && typeof a.flush === "function") return a.flush();
    // Nothing to flush through: export the bytes and write them with the same
    // FileSource the autosave uses. Silently returning null here is what made
    // the gear-menu Save look dead.
    if (ref && typeof ref.exportDocx === "function" && this._fileSource) {
      const buf = await ref.exportDocx();
      if (buf) {
        // `manual: 1` — this is a Save the user pressed, so it bypasses the
        // autosave breaker (collab.js FileSource.save).
        return this._fileSource.save(this._collab.nid || null, buf, { manual: 1 });
      }
    }
    throw new Error("no way to flush the co-editing save");
  }

  /**
   *
   */
  _nudgeResize() {
    let n = 0;
    const tick = () => {
      if (this._destroyed) return;
      window.dispatchEvent(new Event("resize"));
      if (++n < 5) setTimeout(tick, 250);
    };
    setTimeout(tick, 120);
  }

  /**
   * @returns {Promise<String|null>} base64 of the current .docx bytes
   */
  async getContent() {
    // Preferred: the editor's own exporter (round-trips exactly).
    try {
      const api = this._apiHandle;
      if (api && typeof api.exportDocx === "function") {
        const buf = await api.exportDocx();
        if (buf) {
          console.log("[DOCS] getContent via exportDocx, bytes=", (buf.byteLength || buf.length));
          return abToBase64(buf);
        }
      }
    } catch (e) {
      console.error("[DOCS] exportDocx failed", e && e.message);
    }
    // Fallback: pull the live Document off the editor ref (getDocument is not
    // gated by isLoading) and serialize it. Keeps save working even if the
    // onReady api handshake stays silent.
    try {
      let doc = null;
      const ref = this._ref && this._ref.current;
      if (ref && typeof ref.getDocument === "function") doc = ref.getDocument();
      if (!doc) doc = this._currentDoc;
      if (doc && serializeDocx) {
        let out = serializeDocx(doc);
        if (out && typeof out.then === "function") out = await out;
        if (out) {
          const buf =
            out instanceof ArrayBuffer
              ? out
              : out.buffer
              ? out.buffer
              : out instanceof Blob
              ? await out.arrayBuffer()
              : null;
          if (buf) {
            console.log("[DOCS] getContent via serializeDocx, bytes=", buf.byteLength);
            return abToBase64(buf);
          }
        }
      }
    } catch (e) {
      console.error("[DOCS] serializeDocx failed", e && e.message);
    }
    console.warn("[DOCS] getContent: no content available");
    return null;
  }

  /**
   *
   */
  onBeforeDestroy() {
    console.log("[DOCS] onBeforeDestroy (state) called");
    this._destroyed = 1;
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    try {
      if (this._helpObs) {
        this._helpObs.disconnect();
        this._helpObs = null;
      }
      clearTimeout(this._helpTimer);
      clearInterval(this._veilPoll);
      if (this._root) this._root.unmount();
      if (this._host) {
        this._host.remove();
        this._host = null;
      }
      // Every tab kept alive in the background gets torn down with the window
      // — each one holds a live co-editing session.
      if (this._panes) {
        for (const pane of this._panes.values()) {
          try {
            pane.root.unmount();
            pane.host.remove();
          } catch (e) {
            /** already gone */
          }
        }
        this._panes.clear();
      }
    } catch (e) {
      /** already gone */
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }
}

export default __docs_state;

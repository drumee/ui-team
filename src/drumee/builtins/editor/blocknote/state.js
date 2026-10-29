import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
// Named imports, NOT `import * as locales`: the barrel carries 23 languages
// (~190 KB) and we ship six. Anything unreferenced has to tree-shake away —
// measured after the change, not assumed.
import { en, es, fr, ru, zh } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController } from "@blocknote/react";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";
import Callout from "./callout";
import { getNoteSlashItems, NoteSlashMenu } from "./slash-menu";

const { xhRequest } = require("@drumee/ui-essentials");

/**
 * BlockNote's own UI — the "/" menu, the drag handle menus, the selection
 * toolbar, the placeholder that teaches people "/" exists — is English out of
 * the box, while Drumee ships six languages. For a Vietnamese or Khmer reader
 * that placeholder is not a hint, it is noise.
 *
 * These are BlockNote's OWN translations, not ours: it ships en/es/fr/ru/zh
 * (and more), which is every Drumee language except Khmer. Khmer falls back to
 * English, the same default the app itself uses when a page carries no `lang`.
 */
const DICTIONARIES = { en, es, fr, ru, zh };

/**
 * @returns {Object} the BlockNote dictionary for the language the app is in
 */
function dictionary() {
  let lang = "en";
  try {
    lang = `${bootstrap().lang || "en"}`.toLowerCase().split("-")[0];
  } catch (e) {
    /** pre-bootstrap or a page without <html lang>: English, like api.js */
  }
  const dict = DICTIONARIES[lang] || DICTIONARIES.en;
  // The empty-page hint is the Figma's wording ("Press '/' for commands"), in
  // the app's own six languages rather than BlockNote's.
  return {
    ...dict,
    placeholders: {
      ...dict.placeholders,
      default: LOCALE.NOTE_PRESS_SLASH,
      emptyDocument: LOCALE.NOTE_PRESS_SLASH,
    },
  };
}

/**
 * Does an imported document hold nothing at all — only paragraphs without
 * text or children?
 * @param {Array} blocks
 * @returns {Boolean}
 */
function isBlank(blocks) {
  return blocks.every(
    (b) =>
      b &&
      b.type === "paragraph" &&
      !(b.children && b.children.length) &&
      (!Array.isArray(b.content) || b.content.every((c) => !c || !`${c.text || ""}`.trim()))
  );
}

/**
 * BlockNote's own blocks, plus the Callout the Figma's "/" menu offers.
 * Built once: a schema is a description, not per-editor state.
 */
let schema;
function noteSchema() {
  if (!schema) {
    schema = BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, callout: Callout() },
    });
  }
  return schema;
}
const { parse, serialize, isLegacyNote } = require("libs/blocknote-format");
const { resolveTheme } = require("router/theme");

// The BlockNote surface, mounted into a Drumee widget element.
//
// Shape follows editor/diagram (`__editor_diagram` + `__diagram_state`): the
// window owns chrome and saving, this widget owns the third-party editor and
// nothing else. BlockNote is React, so the bridge is one createRoot per widget.
class __blocknote_state extends DrumeeMFS {
  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.media = opt.media;
    this.editor = opt.editor;
    this.escapeContextmenu = true;
    if (this.media) {
      const { nid, pid, hub_id } = this.media.actualNode();
      this.mset({ nid, pid, hub_id });
    }
  }

  /**
   * Fetch the stored note, then mount. A note with no media is a brand-new one
   * and mounts empty.
   */
  onDomRefresh() {
    if (this._mounted) return;
    this.el.setAttribute(_a.id, `${this.mget(_a.widgetId)}-blocknote-state`);

    if (!this.media) {
      this.mount([]);
      return;
    }

    this.media.wait(0);
    const url = this._sourceUrl();
    if (!url) {
      // No readable source for an existing node: treat as a load failure so
      // that autosave cannot replace the file with an empty document.
      this._failLoad("no-url");
      return;
    }

    xhRequest(url, { responseType: _a.text })
      .then((content) => {
        if (this._isLegacy()) {
          this._mountMarkdown(content);
          return;
        }
        const r = parse(content);
        if (r.error) {
          this._failLoad(r.error);
          return;
        }
        // The page decorations travel in the file; the window draws them.
        if (this.editor && this.editor.setPage) {
          this.editor.setPage({ icon: r.icon, cover: r.cover });
        }
        this.mount(r.blocks);
      })
      .catch((e) => {
        this.warn("blocknote_state: failed to load", url, e);
        this._failLoad("unreachable");
      });
  }

  /**
   * Is this node still in the markdown format the old Note wrote?
   *
   * @returns {Boolean}
   */
  _isLegacy() {
    const node = (this.media && this.media.actualNode()) || {};
    return isLegacyNote({
      ext: node.ext || node.extension,
      filetype: node.filetype || node.category,
      mimetype: node.mimetype,
    });
  }

  /**
   * Open a note written by the OLD editor.
   *
   * BlockNote's markdown import is explicitly best-effort — its own
   * documentation says unrecognised syntax is kept as plain text — so this
   * path is READ-first: the blocks it produces are what the user sees, and the
   * file is only rewritten if they choose to edit it, at which point the
   * window converts it to the new format under a new extension. Markdown is
   * NEVER written back: the export side is lossy by name
   * (`blocksToMarkdownLossy`), so a save-as-markdown would quietly shave
   * content off the document on every round trip.
   *
   * An import that yields NOTHING from a file that had bytes is treated as a
   * failure rather than as an empty note, for the same reason a corrupt
   * `.dnote` is: whatever we could not read must not be replaced by a blank
   * document.
   *
   * @param {String} content
   */
  async _mountMarkdown(content) {
    const md = typeof content === "string" ? content : "";
    if (!md.trim()) {
      /** genuinely empty: nothing to lose, open it as a new note */
      this.mount([]);
      return;
    }
    let blocks;
    try {
      const importer = BlockNoteEditor.create({});
      // HTML comments render as nothing in markdown, but a file that OPENS
      // with one (`<!-- draft … -->` above a README) made BlockNote's parser
      // return a single empty paragraph for the whole 7.7 KB file — measured
      // 2026-10-22 on a real note. Dropping them first imports the body.
      blocks = await importer.tryParseMarkdownToBlocks(md.replace(/<!--[\s\S]*?-->/g, ""));
    } catch (e) {
      this.warn("blocknote_state: markdown import failed", e);
      this._failLoad("markdown-import");
      return;
    }
    // "Empty" is judged by what came out, not by the array length: one blank
    // paragraph from a file with bytes in it is a failed import, and mounting
    // it editable would let the first keystroke convert the note into it.
    if (!Array.isArray(blocks) || !blocks.length || isBlank(blocks)) {
      this._failLoad("markdown-empty");
      return;
    }
    this._converted = 1;
    if (this.editor && this.editor.markConverting) this.editor.markConverting();
    this.mount(blocks);
  }

  /**
   * Opening an old note must NOT convert it.
   *
   * A conversion is a write, and the promise made about this migration is that
   * it happens when somebody EDITS the note — not when they glance at it. But
   * `onChange` cannot be trusted to mean "the user typed": an editor seeded
   * with imported content can fire it while mounting, and that alone would be
   * enough for the autosave to convert a file the user only opened. Since a
   * markdown file might be somebody's README rather than a note, converting on
   * a look is not acceptable.
   *
   * So for an imported note the first change is ignored until a real editing
   * event has reached the editor.
   *
   * 🚨 `beforeinput` alone does NOT work, and the failure is silent in the
   * worst way: measured in a browser, ProseMirror (which BlockNote is built
   * on) takes `beforeinput` and only `input` reaches this element. A guard
   * armed on `beforeinput` therefore never arms, and an imported note becomes
   * permanently unsaveable — it looks editable and quietly throws the work
   * away. `input` is what actually arrives, and it is still only dispatched
   * for real editing: seeding the editor with imported content does not fire
   * it. The rest are belt and braces.
   */
  _armUserEdits() {
    if (!this.el || this._armed) return;
    this._armed = 1;
    const wake = () => {
      this._userTouched = 1;
    };
    for (const ev of ["input", "beforeinput", "keydown", "paste", "drop", "cut"]) {
      this.el.addEventListener(ev, wake, true);
    }
  }

  /**
   * @returns {String|null}
   */
  _sourceUrl() {
    const node = this.media.actualNode() || {};
    if (node.url) return node.url;
    const nid = node.nid || this.mget(_a.nid);
    const hub_id = node.hub_id || this.mget(_a.hub_id);
    if (!nid || !hub_id) return null;
    // The shared builder: endpoint + file/orig, plus the share key a dmz
    // visitor needs (without it the share host answers 404).
    return require("../content-url").contentUrl(null, { nid, hub_id });
  }

  /**
   * A note we could not read is opened READ-ONLY and never saved.
   *
   * Mounting an empty editor and letting autosave run would rewrite a file we
   * failed to understand with a blank document — silent, unrecoverable data
   * loss, since office/note files keep no version history.
   *
   * @param {String} reason
   */
  _failLoad(reason) {
    this.warn("blocknote_state: unreadable note, opening read-only", reason);
    this._loadFailed = 1;
    if (this.editor && this.editor.setReadOnly) this.editor.setReadOnly(reason);
    this.mount([], { readOnly: true });
  }

  /**
   * @param {Array} blocks
   * @param {Object} opt
   */
  mount(blocks, opt = {}) {
    if (this._mounted || this._destroyed || !this.el) return;
    this._mounted = 1;

    // BlockNote rejects an EMPTY initialContent array — a new note has to pass
    // undefined so the editor seeds its own first paragraph.
    const initialContent = blocks && blocks.length ? blocks : undefined;

    try {
      this._editor = BlockNoteEditor.create({
        schema: noteSchema(),
        initialContent,
        dictionary: dictionary(),
      });
    } catch (e) {
      this.warn("blocknote_state: editor refused the stored content", e);
      this._loadFailed = 1;
      if (this.editor && this.editor.setReadOnly) {
        this.editor.setReadOnly("rejected");
      }
      this._editor = BlockNoteEditor.create({ schema: noteSchema(), dictionary: dictionary() });
      opt.readOnly = true;
    }

    if (this._converted) this._armUserEdits();

    // Every real edit marks the window dirty; the window owns the debounce.
    this._unsubscribe = this._editor.onChange(() => {
      if (this._loadFailed) return;
      // An imported note waits for a genuine keystroke — see _armUserEdits.
      if (this._converted && !this._userTouched) return;
      if (this.editor && this.editor.markDirty) this.editor.markDirty();
    });

    // Also read-only for a reader of the note (editor_blocknote.isViewOnly).
    const viewOnly = !!(this.editor && this.editor.isViewOnly && this.editor.isViewOnly());
    this._editable = !opt.readOnly && !viewOnly;
    this._root = createRoot(this.el);
    this._paint();

    // The player window sets user-select:none for its drag chrome, and the
    // window's own contextmenu handler would otherwise swallow right-clicks
    // inside the editor. Both are handled in skin/ and here respectively.
    this.el.addEventListener("contextmenu", (e) => e.stopPropagation(), false);
  }

  /**
   * Render the editor with BlockNote's own defaults — the pop-up formatting
   * toolbar at the selection, the side menu — except the "/" menu, which is
   * the Figma's list (./slash-menu) on BlockNote's own controller.
   *
   * BlockNote renders children AFTER the editor; the controller is a floating
   * layer, so that order does not matter for it.
   */
  _paint() {
    if (!this._root) return;
    this._root.render(
      createElement(
        BlockNoteView,
        {
          editor: this._editor,
          editable: this._editable,
          slashMenu: false,
          // Ask the app rather than hardcoding a literal. Dark mode is disabled
          // product-wide today (router/theme.js DARK_MODE_ENABLED = false), so
          // this resolves to "light" and renders EXACTLY as before — the point
          // is that if that switch is ever flipped, the editor follows instead
          // of staying a white slab in a dark app.
          theme: resolveTheme(),
        },
        createElement(SuggestionMenuController, {
          triggerCharacter: "/",
          getItems: getNoteSlashItems(this._editor),
          suggestionMenuComponent: NoteSlashMenu,
        })
      )
    );
  }

  /**
   * @returns {String|null} the bytes to save, or null when saving is unsafe
   */
  getContent() {
    if (this._loadFailed || !this._editor) return null;
    try {
      const page = this.editor && this.editor.page ? this.editor.page() : {};
      return serialize(this._editor.document, page);
    } catch (e) {
      this.warn("blocknote_state: could not serialize", e);
      return null;
    }
  }

  /**
   * The export module (./export), fetched as its own chunk on first use.
   * @returns {Promise<Object>}
   */
  async exporter() {
    const m = await import(/* webpackChunkName: "note-export" */ "./export");
    return m.default || m;
  }

  /**
   * The note rendered for export. The converters live in ./export, a chunk of
   * its own that is only fetched the first time someone exports.
   *
   * @param {String} format  html | print | md | csv  (pdf / docx are the
   *   server's job — they are made from the html)
   * @param {String} title
   * @returns {Promise<String|Array<String>|null>} null when there is no
   *   editor to read (load failed); csv resolves to one string per table
   */
  async exportAs(format, title) {
    if (this._loadFailed || !this._editor) return null;
    const x = await this.exporter();
    return x.render(format, this._editor, title);
  }

  /**
   *
   */
  onBeforeDestroy() {
    this._destroyed = 1;
    try {
      if (this._unsubscribe) this._unsubscribe();
    } catch (e) {
      /** already gone */
    }
    // React forbids unmounting from inside its own render/commit; Backbone
    // tears us down outside it, but a microtask keeps that guaranteed.
    const root = this._root;
    this._root = null;
    if (root) Promise.resolve().then(() => root.unmount());
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }
}

export default __blocknote_state;

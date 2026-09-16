
const __skl_window_application = function (filetype, opt = {}) {
  const a = {
    contact: {
      kind: "window_contact",
    },

    folder: {
      kind: "window_folder",
    },
    
    hub: {
      kind: "window_folder",
    },

    personal: {
      kind: "window_folder",
    },

    hub_private: {
      kind: "window_team",
    },

    private: {
      kind: "window_team",
    },

    hub_share: {
      kind: "window_sharebox",
    },

    share: {
      kind: "window_sharebox",
    },

    hub_public: {
      kind: "window_website",
    },

    public: {
      kind: "window_website",
    },

    note: {
      kind: "editor_note",
    },

    "drumee.note": {
      kind: "editor_note",
    },

    schedule: {
      kind: "schedule_viewer",
    },

    image: {
      kind: "image_viewer",
    },

    document: {
      kind: "document_reader",
    },

    markdown: {
      kind: "editor_markdown",
    },

    audio: {
      kind: "audio_player",
    },

    video: {
      kind: "video_viewer",
    },

    vector: {
      kind: "vector_viewer",
    },

    text: {
      kind: "text_viewer",
    },

    txt: {
      kind: "text_viewer",
    },

    template: {
      kind: "text_viewer",
    },

    shell: {
      kind: "text_viewer",
    },

    shell: {
      kind: "text_viewer",
    },

    script: {
      kind: "text_viewer",
    },
  };

  let { media } = opt;

  // Notion-style Note (BlockNote), shipped ALONGSIDE the existing note and
  // markdown editors while it is evaluated. Checked before anything else and
  // keyed on an extension only this editor ever writes, so no file that opens
  // somewhere today can be routed away from the editor that owns it.
  //
  // Extension rather than filetype because these notes deliberately carry
  // `filetype: note` — that is what gives them the note icon in the grid and
  // puts them in the Notes filter — and `note` already maps to editor_note.
  const { EXT: BLOCKNOTE_EXT } = require("libs/blocknote-format");
  const ext = `${opt.ext ||
    opt.extension ||
    (media && media.mget && (media.mget(_a.ext) || media.mget(_a.extension))) ||
    ""}`.toLowerCase();
  if (ext === BLOCKNOTE_EXT) {
    return { ...opt, kind: "editor_blocknote" };
  }

  let r = a[filetype] || {};
  if (media && media.model) {
    let { mimetype, dataType } = media.model.toJSON();
    if (media.imgCapable && media.imgCapable()) {
      let { kind } = a[filetype] || { kind: "image_viewer" };
      return { kind, ...opt };
    }
    if (/text|script|json/i.test(mimetype)) {
      switch (mimetype) {
        case "text/markdown":
          return { ...opt, kind: "editor_markdown" };
        case "text/html":
        case "text/*":
          switch (dataType) {
            case "drumee.note":
              return { ...opt, kind: "editor_note" };
          }
          break;
        case "application/json":
          if (r.kind) {
            return { ...opt, kind: r.kind };
          }
          switch (dataType) {
            case "diagram.state":
              return { ...opt, kind: "editor_diagram" };
            default:
              return { kind: "text_viewer", ...opt };
          }
      }
      if (r.kind) {
        return { ...opt, kind: r.kind };
      }
      return { ...opt, kind: "text_viewer" };
    }
  }

  return { ...r, ...opt, kind: r.kind };
};
//

module.exports = __skl_window_application;

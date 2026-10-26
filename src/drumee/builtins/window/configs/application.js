const { casualKind } = require("libs/file-meta");

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
  let r = a[filetype] || {};
  // A Casual doc / sheet is "text" by category, so every path that resolves
  // a player from the category alone (a desk link, a tile inserted by the
  // editor's own first save, Recently viewed) would land in the text viewer
  // and show the stored JSON. Route them by extension / dataType from the
  // node itself, media view or not (the tile's media carries the same).
  {
    const node = media && media.model ? media.model.toJSON() : opt;
    const name = String((node && node.filename) || "");
    const ext = String(
      (node && node.ext) || (name.includes(".") ? name.split(".").pop() : "")
    ).toLowerCase();
    const casual = casualKind({ ...(node || {}), ext });
    if (casual === "sheet") return { ...opt, kind: "editor_sheet" };
    if (casual === "docs") return { ...opt, kind: "editor_docs" };
  }
  if (media && media.model) {
    const json = media.model.toJSON();
    let { mimetype, dataType } = json;
    // Casual files: by the dedicated `.usheet` / `.udoc` extension, or by the
    // dataType marker of the early `.json` sheets (libs/file-meta casualKind).
    const casual = casualKind(json);
    if (casual === "sheet") return { ...opt, kind: "editor_sheet" };
    if (casual === "docs") return { ...opt, kind: "editor_docs" };
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
            case "sheet.univer":
              return { ...opt, kind: "editor_sheet" };
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

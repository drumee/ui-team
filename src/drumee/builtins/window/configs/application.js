
const __skl_window_application = function (filetype, opt = {}) {
  const a = {
    contact: {
      kind: "window_contact",
    },

    folder: {
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
  if (media && media.model) {
    let { mimetype, dataType } = media.model.toJSON();
    if (media.imgCapable()) {
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

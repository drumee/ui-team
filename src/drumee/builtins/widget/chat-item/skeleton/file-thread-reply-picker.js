// Multi-file reply picker — shown when the reply action fires on a team-chat
// message that references several files (multiple uploads / mentions). Lets the
// user choose which file's thread to reply into. Lazy-appended by
// chat-item._openFileThreadReplyPicker; skin/menu.scss floats it beside the
// bubble. One row per file; clicking a row emits "pick-thread-file".
const __skl_chatItem_thread_picker = function (_ui_, files) {
  const fig = _ui_.fig.family;
  const pfx = `${fig}-thread-picker`;

  const rows = (files || []).map((f) =>
    Skeletons.Box.X({
      className: `${pfx}__item`,
      service: "pick-thread-file",
      // Custom props become model attrs so onUiEvent reads them via mget.
      file_nid: f.file_nid,
      filename: f.filename || "",
      uiHandler: [_ui_],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__ico` }),
        Skeletons.Note({
          className: `${pfx}__label`,
          content: f.filename || f.file_nid,
        }),
      ],
    }),
  );

  return Skeletons.Box.Y({
    className: `${pfx}__bar`,
    sys_pn: "thread-picker",
    partHandler: _ui_,
    kids: [
      Skeletons.Note({
        className: `${pfx}__header`,
        content: LOCALE.REPLY_IN_THREAD,
      }),
      ...rows,
    ],
  });
};

module.exports = __skl_chatItem_thread_picker;

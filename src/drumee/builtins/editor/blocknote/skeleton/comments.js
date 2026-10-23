// ===========================================================
//  Notion-style Note — page comments (Figma 1406:28442).
// ===========================================================

/**
 * The comments already on the note, then the "Add a comment…" bar. They are
 * the note's own chat thread (channel.file_thread_*), so a comment written
 * here is the same message the file's chat thread shows.
 *
 * @param {View} ui the editor window
 * @param {Array} comments thread messages, oldest first
 */
module.exports = function (ui, comments) {
  const pfx = ui.fig.family;
  const { plainText } = require("../page");

  const item = (m) => {
    const mine = `${m.author_id}` === `${Visitor.id}`;
    const who = mine ? Visitor : null;
    const entity = m.entity || {};
    const firstname = who ? Visitor.get(_a.firstname) : entity.firstname || m.firstname || "";
    const lastname = who ? Visitor.get(_a.lastname) : entity.lastname || m.lastname || "";
    const name =
      `${firstname || ""} ${lastname || ""}`.trim() || entity.fullname || entity.email || "";
    const when = m.ctime ? Dayjs.unix(Number(m.ctime)).fromNow() : "";
    return Skeletons.Box.X({
      className: `${pfx}__comment`,
      kids: [
        Skeletons.UserProfile({
          className: `${pfx}__comment-avatar`,
          id: m.author_id,
          firstname,
          lastname,
        }),
        Skeletons.Box.Y({
          className: `${pfx}__comment-body`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__comment-meta`,
              kids: [
                Skeletons.Note({ className: `${pfx}__comment-name`, content: _.escape(name) }),
                Skeletons.Note({ className: `${pfx}__comment-time`, content: _.escape(when) }),
              ],
            }),
            Skeletons.Note({
              className: `${pfx}__comment-text`,
              content: _.escape(plainText(m.message)),
            }),
          ],
        }),
      ],
    });
  };

  const tool = (ico, service, tooltips) =>
    Skeletons.Button.Svg({
      ico,
      className: `${pfx}__comment-tool`,
      service,
      tooltips,
      uiHandler: [ui],
    });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__comments`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__comment-list`,
        kids: (comments || []).map(item),
      }),
      Skeletons.Box.X({
        className: `${pfx}__comment-bar`,
        kids: [
          Skeletons.UserProfile({
            className: `${pfx}__comment-avatar`,
            id: Visitor.id,
            firstname: Visitor.get(_a.firstname),
            lastname: Visitor.get(_a.lastname),
          }),
          Skeletons.Entry({
            className: `${pfx}__comment-entry`,
            sys_pn: "comment-entry",
            partHandler: ui,
            placeholder: LOCALE.NOTE_ADD_A_COMMENT,
            mode: "commit",
            service: "post-comment",
            uiHandler: [ui],
          }),
          Skeletons.Box.X({
            className: `${pfx}__comment-tools`,
            kids: [
              tool("ph-paperclip", "comment-attach", LOCALE.ATTACH_FILE),
              tool("ph-at", "comment-mention", LOCALE.NOTE_MENTION),
              tool("ph-arrow-circle-up", "post-comment", LOCALE.SEND),
            ],
          }),
        ],
      }),
    ],
  });
};

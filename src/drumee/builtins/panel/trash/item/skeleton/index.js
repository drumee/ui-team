const { trashedAt, dayLabel } = require("../group");
const { fileIcon } = require("../file-icon");

// A trash row as drawn in Figma 43:34212 ("notification card feed"):
//   [day label — only on a group's first row, see ../group]
//   [icon tile] name
//               Deleted by: <who> | Date: Mar 15      [N days left|Restore] [bin]
module.exports = function (ui) {
  const pfx = ui.fig.family;
  const filename = ui.mget(_a.filename) || "";
  const ext = ui.mget(_a.ext) ? `.${ui.mget(_a.ext)}` : "";
  const filetype = ui.mget(_a.filetype) || "";
  const icon = fileIcon({
    filetype,
    ext: ui.mget(_a.ext),
    mimetype: ui.mget(_a.mimetype),
    dataType: ui.mget("dataType"),
  });
  // modifier_name is what mfs_show_bin returns; `modifier` is the older field.
  const who = ui.mget("modifier_name") || ui.mget(_a.modifier) || "me";
  const daysLeft = Number.isFinite(Number(ui.mget("days_remaining")))
    ? Number(ui.mget("days_remaining"))
    : 30;

  const attrs = { trashed_time: ui.mget("trashed_time"), mtime: ui.mget(_a.mtime) };
  const ts = trashedAt(attrs);
  const when = ts ? Dayjs.unix(ts) : Dayjs();
  const date = when.format(when.year() === Dayjs().year() ? "MMM D" : "MMM D, YYYY");

  // Where it lived: the workspace, then the folders above it. No longer a line
  // of its own in this design — kept as the name's hover title.
  let location = null;
  const parentPath = ui.mget("parent_path");
  if (parentPath != null) {
    const segments = String(parentPath).split("/").filter((s) => s && s !== ".");
    const hubName = ui.mget("hub_name");
    const parts = hubName ? [hubName, ...segments] : segments;
    location = parts.length ? parts.join(" / ") : LOCALE.PERSONAL;
  }

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    kids: [
      Skeletons.Note({ className: `${pfx}__group`, content: dayLabel(ts) }),
      Skeletons.Box.X({
        className: `${pfx}__row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__tile`,
            kids: [
              Skeletons.Image.Svg({
                ico: icon.ico,
                className: `${pfx}__tile-ico ${pfx}__tile-ico--${icon.tone}`,
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__name`,
                content: `${filename}${ext}`,
                attribute: location ? { title: location } : undefined,
              }),
              Skeletons.Box.X({
                className: `${pfx}__meta`,
                kids: [
                  // Escaped: the label carries markup, so the Note parses it.
                  Skeletons.Note({
                    className: `${pfx}__deleted-by`,
                    content: `${LOCALE.DELETED_BY}: <span class="${pfx}__who">${_.escape(who)}</span>`,
                  }),
                  Skeletons.Box.X({ className: `${pfx}__divider` }),
                  Skeletons.Note({
                    className: `${pfx}__date`,
                    content: `${LOCALE.DATE}: ${date}`,
                  }),
                ],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__actions`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__days-badge`,
                content: LOCALE.X_DAYS_LEFT.format(daysLeft),
              }),
              Skeletons.Note({
                className: `${pfx}__restore`,
                service: "restore-to-desk",
                content: LOCALE.RESTORE,
                uiHandler: ui,
              }),
              Skeletons.Button.Svg({
                ico: "ph-trash",
                className: `${pfx}__delete`,
                service: "delete-permanently",
                uiHandler: ui,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

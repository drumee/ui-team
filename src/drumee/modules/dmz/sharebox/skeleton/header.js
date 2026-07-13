const { isSharedArea } = require('../area');

function __skl_dmz_sharebox_header(ui) {
  const headerFig = `${ui.fig.family}-header`;
  const area = ui.mget(_a.area) || _a.share;
  // Restricted workspace → lock glyph; shared/public/dmz link → link glyph.
  const restricted = !isSharedArea(area);

  const folderIcon = Skeletons.Box.X({
    className: `${headerFig}__folder-icon`,
    kids: [
      require("../../../../builtins/window/skeleton/topbar/folder-icon")(area),
    ],
  });

  // Figma 3.1 hero: "Shared Project: {name}" — the localized prefix precedes the
  // shared item's name.
  const sharedName = ui.mget(_a.title) || ui.mget(_a.filename) || ui.mget(_a.name) || "";
  const titleNote = Skeletons.Note({
    className: `${headerFig}__title-text`,
    content: `${LOCALE.SECURE_SHARE_SHARED_PROJECT} ${sharedName}`,
  });

  const expiryTime = ui.mget('is_secure') ? (ui.mget('expiry_time') || 0) : 0;
  const expiryNote = (expiryTime > 0)
    ? Skeletons.Note({
        className: `${headerFig}__subline-expiry`,
        content: `· ${LOCALE.SECURE_SHARE_EXPIRY_LABEL} ${Dayjs.unix(expiryTime).fromNow()}`
      })
    : null;

  const subline = Skeletons.Box.X({
    className: `${headerFig}__subline`,
    kids: [
      Skeletons.Button.Svg({
        ico: restricted ? "profile-lock" : "apps-link-simple",
        className: `${headerFig}__subline-icon`,
      }),
      Skeletons.Note({
        className: `${headerFig}__subline-label`,
        content: LOCALE.SHARED_BY_LINK || "Shared by link",
      }),
      expiryNote,
    ].filter(Boolean),
  });

  const titleBlock = Skeletons.Box.Y({
    className: `${headerFig}__title-block`,
    sys_pn: _a.title,
    kids: [titleNote, subline],
  });

  const titleGroup = Skeletons.Box.X({
    className: `${headerFig}__title-group`,
    kids: [folderIcon, titleBlock],
  });

  const parentName = ui.mget(_a.parent_name) || ui.mget("sender") || "";
  const currentName =
    ui.mget(_a.title) || ui.mget(_a.filename) || ui.mget(_a.name) || "";

  const breadcrumb = Skeletons.Box.X({
    className: `${headerFig}__breadcrumb`,
    kids: [
      Skeletons.Note({
        className: `${headerFig}__breadcrumb-segment parent`,
        content: parentName,
      }),
      Skeletons.Note({
        className: `${headerFig}__breadcrumb-separator`,
        content: "/",
      }),
      Skeletons.Note({
        className: `${headerFig}__breadcrumb-segment current`,
        content: currentName,
      }),
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${headerFig}__container`,
    kids: [titleGroup, breadcrumb],
  });
}

export default __skl_dmz_sharebox_header;

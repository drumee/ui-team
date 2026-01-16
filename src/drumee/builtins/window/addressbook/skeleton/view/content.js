

const __skl_addressbook_view_content = function (ui) {
  let breadcrumb;

  const tags = {
    kind: "widget_tag",
    className: "widget_tag",
    type: _a.contact,
    sys_pn: "widget_tag",
  };

  const contacts = {
    kind: "widget_contacts",
    className: "widget_contacts",
  };

  const contactDetail = {
    kind: "widget_contact_detail",
    className: "widget_contact_detail",
    sys_pn: "contact_detail",
  };

  const maxContent = Skeletons.Box.X({
    className: `${ui.fig.family}__max-content ${ui.fig.group}__max-content max-content`,
    sys_pn: "max-content",
  });

  const view = Skeletons.Box.X({
    debug: __filename,
    sys_pn: "max-view",
    className: `${ui.fig.family}__max-view ${ui.fig.group}__max-view view-content`,

    kids: [
      // (breadcrumb = require("../common/breadcrumbs")(ui)),
      require("../common/overlay-wrapper")(ui),
      Skeletons.Box.X({
        className: "tags-list",
        sys_pn: "tags",
        kids: [tags],
      }),

      Skeletons.Box.X({
        className: `${ui.fig.family}__contact-wrapper`,
        sys_pn: "contact-wrapper",
        kids: [
          // contacts
        ],
      }),
      maxContent,
    ],
  });

  const content = Skeletons.Box.Y({
    className: `${ui.fig.family}__max-view ${ui.fig.group}__max-view AZERTWQA main-content`,
    kids: [require("../common/search")(ui), view],
  });

  return content;
};

module.exports = __skl_addressbook_view_content;

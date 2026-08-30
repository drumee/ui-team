/**
 * The tour's topbar (visual only; no services).
 *
 * Drumee 2.0 — Figma canvas 129:13815. Left: the workspace breadcrumb.
 * Right: the utility cluster (notifications, calendar, inbox, contacts, trash,
 * apps) and the account avatar — mirroring the real bar
 * (modules/desk/skeleton/topbar.js), where those utilities landed after they
 * left the sidebar.
 *
 * The design also puts an org chip ("Org-name" + plan badge + chevron) at the
 * far left and a "Department-name /" segment ahead of the workspace. Both are
 * gated off — see ./org.js.
 *
 * What is NOT here, deliberately: Add new, Upload, Search and Invite. The old
 * tutorial topbar carried them because the old desk topbar did; in 2.0 search
 * and creation live inside the workspace pane and Invite is a rail entry, so
 * drawing them here would teach three controls that are not in the product.
 */

const { orgOnly } = require("./org");
// The area-tinted workspace shape, from the single source the desk breadcrumb,
// the sidebar and the workspace switcher all render it through. It returns an
// HTML STRING, hence Element + content rather than Image.Svg + ico — passing
// markup as an icon NAME builds `<use href="#<markup>">` and renders nothing.
const folderArt = require("media/grid/template/folder");

/**
 * One utility icon. `dot` paints the unread pip the design shows on the bell.
 */
const utility = (p, ico, opt = {}) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}-utility-btn`,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico, className: `${p}-utility-ico` }),
      opt.dot ? Skeletons.Box.Y({ active: 0, className: `${p}-utility-dot` }) : null,
    ].filter(Boolean),
  });

/**
 * The workspace crumb: tinted shape + name.
 *
 * Absent on the org-home frames, where no workspace is open — the create-
 * workspace flow shows only the org chip, and naming a workspace there would
 * be naming one that does not exist yet. The host feeds this per step (see
 * tutorial/index.js _applyChrome).
 *
 * `area` decides the tint, so a step teaching an external workspace can say so
 * and get the pink shape the product would give it.
 */
const workspaceCrumb = (ui, p) => {
  const area = ui.mget("mock_area") || _a.private;
  return Skeletons.Box.X({ active: 0,
    className: `${p}-crumb`,
    kids: [
      Skeletons.Element({ active: 0,
        className: `${p}-crumb-icon ${area}`,
        content: folderArt({
          area,
          filetype: _a.hub,
          role: "desk",
          widgetId: _.uniqueId("tutorial-crumb-"),
          // No kebab in a breadcrumb: there is nothing for it to act on.
          isAttachment: 1,
        }),
      }),
      Skeletons.Note({ active: 0,
        className: `${p}-crumb-name`,
        content: ui.mget("mock_workspace") || LOCALE.WORKSPACE_NAME,
      }),
    ],
  });
};

/**
 * The viewer's own identity, in the shape UserProfile wants.
 *
 * Same defensive read as the real topbar (skeleton/topbar.js userMenu):
 * UserProfile renders an avatar from `id` and falls back to initials from the
 * name fields — given NEITHER it renders an empty circle.
 */
const identity = () => {
  const firstname = Visitor.firstname ? Visitor.firstname() : "";
  const lastname = Visitor.lastname ? Visitor.lastname() : "";
  return {
    id: Visitor.id,
    firstname,
    lastname,
    fullname:
      (Visitor.fullname ? Visitor.fullname() : "") ||
      `${firstname} ${lastname}`.trim(),
    auto_color: 1,
  };
};

module.exports = function (ui) {
  const fig = ui.fig.family;
  const p = `${fig}__tb`;

  return Skeletons.Box.X({ active: 0,
    className: `${p}-topbar`,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}-left-cluster`,
        kids: [
          orgOnly(() =>
            Skeletons.Box.X({ active: 0,
              className: `${p}-org`,
              kids: [
                Skeletons.Note({ active: 0,
                  className: `${p}-org-name`,
                  content: Organization.name(),
                }),
                Skeletons.Note({ active: 0,
                  className: `${p}-org-plan`,
                  content: require("libs/billing").planLabel(),
                }),
              ],
            }),
          ),
          // Fed per step: absent on the org-home screens, the workspace crumb
          // everywhere else.
          Skeletons.Box.X({ active: 0,
            className: `${p}-crumb-slot`,
            sys_pn: "crumb",
            partHandler: ui,
          }),
        ].filter(Boolean),
      }),

      Skeletons.Box.X({ active: 0,
        className: `${p}-utility-cluster`,
        kids: [
          utility(p, "top-bell", { dot: true }),
          utility(p, "top-calendar"),
          utility(p, "top-inbox"),
          utility(p, "top-contacts"),
          utility(p, "top-trash"),
          utility(p, "top-apps"),
          Skeletons.Box.X({ active: 0,
            className: `${p}-avatar`,
            kids: [
              Skeletons.UserProfile({
                ...identity(),
                className: `${p}-avatar-img`,
                active: 0,
                live_status: 0,
                oneLetter: 1,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// The host re-feeds the crumb slot as the tour moves between contexts.
module.exports.workspaceCrumb = (ui) => workspaceCrumb(ui, `${ui.fig.family}__tb`);

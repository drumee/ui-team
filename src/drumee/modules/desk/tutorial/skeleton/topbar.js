/**
 * The tour's topbar (visual only; no services).
 *
 * Drumee 2.0 — Figma canvas 129:13815. Left: the workspace breadcrumb.
 * Right: the utility cluster (notifications, calendar, inbox, contacts, trash,
 * apps) and the account avatar — mirroring the real bar
 * (modules/desk/skeleton/topbar.js), where those utilities landed after they
 * left the sidebar.
 *
 * The far left is the org chip — avatar, "Org-name", the plan tag and a
 * chevron, on a grey pill (Figma 140:22684, component 43:27965). It is the
 * first thing on the org-home frames, and on those frames it is the ONLY thing
 * on the left: no workspace exists yet, so the crumb slot beside it is fed
 * empty (see tutorial/index.js _applyChrome).
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
 * The org chip — Figma component 43:27965, as 140:22684 draws it at the top
 * left: a grey pill holding the org avatar, the org name, the plan tag and a
 * chevron.
 *
 * The avatar is the org's INITIAL on a brand tile, not a picture. The frame
 * shows a photograph, and Organization has no logo to serve one from
 * (ui-core letc/organization.js `logo()` is an empty stub) — so the shape and
 * the box are the design's and the content is the only thing that is true.
 * Inventing a placeholder photograph would put a face on an organisation that
 * has not chosen one.
 *
 * Inert like everything else in this bar: the chevron says the real chip opens
 * a menu; nothing here opens anything.
 */
const orgTab = (p) => {
  const name = Organization.name();
  return Skeletons.Box.X({ active: 0,
    className: `${p}-org`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-org-avatar`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-org-avatar-text`,
            // `name` comes back ucFirst()'d from Organization, and may be ""
            // on a deployment that names nothing — an empty tile is the right
            // answer there, not a stray character.
            content: (name || "").charAt(0),
          }),
        ],
      }),
      Skeletons.Note({ active: 0, className: `${p}-org-name`, content: name }),
      Skeletons.Note({ active: 0,
        className: `${p}-org-plan`,
        content: require("libs/billing").planLabel(),
      }),
      Skeletons.Image.Svg({ active: 0,
        // The frame's CaretDown is Phosphor's, and so is this symbol.
        ico: "ph-caret-down",
        className: `${p}-org-caret`,
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
          orgOnly(() => orgTab(p)),
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

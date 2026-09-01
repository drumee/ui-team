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

// The six utilities, in the design's order, with the DESK'S OWN service names
// (modules/desk/skeleton/topbar.js utilityCluster). Same six entries meaning
// the same six things — the tour does not invent a second vocabulary for them.
const UTILITIES = [
  { ico: "top-bell", label: () => LOCALE.NOTIFICATIONS, service: "toggle-activity", dot: true },
  { ico: "top-calendar", label: () => LOCALE.CALENDAR, service: "toggle-calendar" },
  { ico: "top-inbox", label: () => LOCALE.INBOX, service: "toggle-inbox" },
  { ico: "top-contacts", label: () => LOCALE.CONTACTS, service: "toggle-contacts" },
  { ico: "top-trash", label: () => LOCALE.TRASH, service: "toggle-trash" },
  { ico: "top-apps", label: () => LOCALE.ADMIN_CONSOLE, service: "toggle-apps" },
];

/**
 * One utility icon. `dot` paints the unread pip the design shows on the bell.
 *
 * Inert for eight of the nine screens. On the last one the desk is real behind
 * the tour, so the icon takes a click and raises the desk's own service.
 *
 * `tooltips` MUST be {content, className}, never a bare string: the framework
 * mounts the tooltip as a real child, and without a class of its own it renders
 * as plain text INSIDE the 28px button and pushes the row apart. The real
 * topbar carries the same note.
 */
const utility = (ui, p, item, opt = {}) =>
  Skeletons.Box.Y({
    ...(opt.live
      ? {
          service: item.service,
          uiHandler: [ui],
          tooltips: { content: item.label(), className: `${p}-utility-tip` },
          // An explicit flag for the skin. `data-service` is NOT stamped by
          // ui-core — a selector on it matches nothing, which is how a cursor
          // and a hover state can be written and never appear.
          dataset: { live: 1 },
          attrOpt: { "data-live": 1 },
        }
      : { active: 0 }),
    className: `${p}-utility-btn`,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: item.ico, className: `${p}-utility-ico` }),
      item.dot ? Skeletons.Box.Y({ active: 0, className: `${p}-utility-dot` }) : null,
    ].filter(Boolean),
  });

/**
 * The cluster's CONTENTS, re-fed per screen the way the rail's are — the six
 * icons and the avatar. The slot itself stays put (see the composer below);
 * feeding the container back into its own slot would nest a second one.
 *
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {Boolean} [opt.live] the icons answer a click
 */
const utilityItems = (ui, opt = {}) => {
  const p = `${ui.fig.family}__tb`;
  return [
    ...UTILITIES.map((item) => utility(ui, p, item, opt)),
    Skeletons.Box.X({
      // Live, the avatar leaves the tour — the menu it opens in the product
      // belongs to the desk's own avatar, and anchoring a copy of it to this
      // one would be a second menu over a bar that is about to disappear.
      ...(opt.live
        ? {
            service: "tb-avatar",
            uiHandler: [ui],
            dataset: { live: 1 },
            attrOpt: { "data-live": 1 },
          }
        : { active: 0 }),
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
  ];
};

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

      // A SLOT, like the crumb and the rail's nav. The icons inside are re-fed
      // per screen so they can go from scenery to controls on the last one,
      // and the container stays put — feeding it back into itself would nest a
      // second cluster.
      Skeletons.Box.X({ active: 0,
        className: `${p}-utility-cluster`,
        sys_pn: "utility-cluster",
        partHandler: ui,
        kids: utilityItems(ui),
      }),
    ],
  });
};

// The host re-feeds both slots as the tour moves between contexts.
module.exports.workspaceCrumb = (ui) => workspaceCrumb(ui, `${ui.fig.family}__tb`);
module.exports.utilityItems = utilityItems;

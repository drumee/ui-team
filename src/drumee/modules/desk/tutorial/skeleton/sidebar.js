/**
 * The tour's left rail (visual only; no services).
 *
 * Drumee 2.0 — Figma canvas 129:13815. The rail the tour draws is the
 * WORKSPACE-scoped one: Files / Chat / Task / Meet / Access, with Invite and
 * Plan pinned to the bottom. That is the same set, in the same order, with the
 * same icons and the same locale keys as the real rail
 * (modules/desk/skeleton/sidebar.js createRailNav / createRailFooter) — the
 * point being that if the real rail gains or loses an entry, the divergence
 * shows up here as a diff rather than as a tour quietly teaching a rail that
 * no longer exists.
 *
 * What the OLD tutorial rail showed — Home, Notifications, Inbox, Contacts,
 * Trash, Apps, a workspace list and a user footer — has not been dropped from
 * the product, it MOVED: those are the topbar's utility cluster and avatar
 * menu now (see ./topbar.js).
 */

const { orgOnly } = require("./org");

const pfx = (ui) => `${ui.fig.family}__sb`;

/**
 * One rail entry: icon over label, the way 2.0 stacks them.
 *
 * `active` paints the filled tile behind the icon. Purely declarative — the
 * rail is scenery, so nothing here carries a service.
 */
const railItem = (ui, ico, label, opt = {}) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({
    // Inert scenery for eight of the nine screens. On the last one a workspace
    // exists and the rail is the real one, so its entries take a click and
    // raise the DESK'S OWN service names — the tour is not inventing a second
    // vocabulary for the same five tabs.
    ...(opt.service
      ? { service: opt.service, uiHandler: [ui] }
      : { active: 0 }),
    className: `${p}-item`,
    dataset: { active: opt.active ? 1 : 0 },
    attrOpt: { "data-active": opt.active ? 1 : 0 },
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-item-tile`,
        kids: [Skeletons.Image.Svg({ active: 0, ico, className: `${p}-item-icon` })],
      }),
      Skeletons.Note({ active: 0, className: `${p}-item-text`, content: label }),
    ],
  });
};

const logo = (ui) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-logo`,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: "rail-logo", className: `${p}-logo-icon` }),
      Skeletons.Box.Y({ active: 0, className: `${p}-logo-rule` }),
    ],
  });
};

/**
 * The rail's middle section, which is WORKSPACE-scoped.
 *
 * It is absent on the org-home frames (Figma 176:40762 and the rest of the
 * create-workspace flow): with no workspace open there are no workspace tabs,
 * and the rail there is just the logo, the Dept. entry and the footer. Drawing
 * Files/Chat/Task/Meet/Access over the create-workspace dialog invents five
 * tabs the user cannot have yet.
 *
 * @param {Object} ui
 * @param {String|null} active which entry is lit — a step names the surface it
 *   is teaching ('chat', 'task', …). `null` means no workspace is open, and
 *   the section renders empty.
 */
const railItems = (ui, active, opt = {}) => {
  // The desk's own service names (modules/desk/index.js "rail-files" …), so a
  // live entry here means what the same entry means there.
  const tab = (key) => (opt.live ? `rail-${key}` : null);
  return active
    ? [
        railItem(ui, "rail-files", LOCALE.FILES, { active: active === "files", service: tab("files") }),
        railItem(ui, "rail-chat", LOCALE.CHAT, { active: active === "chat", service: tab("chat") }),
        railItem(ui, "rail-task", LOCALE.TASK, { active: active === "task", service: tab("task") }),
        railItem(ui, "rail-meet", LOCALE.MEET, { active: active === "meet", service: tab("meet") }),
        railItem(ui, "rail-access", LOCALE.ACCESS, { active: active === "access", service: tab("access") }),
      ]
    : [];
};

/**
 * The rail's middle SLOT. The items inside it are re-fed per step by the host
 * (tutorial/index.js _applyChrome), so this returns the container and
 * `railItems` returns what goes in it — handing the container back from both
 * would feed an __sb-nav into the __sb-nav slot and nest a duplicate.
 */
/**
 * Everything that goes IN the rail's middle slot: the org's Dept. entry, then
 * the workspace tabs.
 *
 * This, not `railItems`, is what the host re-feeds per step — the slot is
 * replaced wholesale, so a composer that returned only the tabs dropped Dept.
 * on the first _applyChrome and the org-home rail rendered empty.
 *
 * 140:22688 draws Dept. LIT, because on those screens it is where the user is:
 * no workspace exists, so nothing else can be. It gives that up the moment a
 * workspace tab is active, or the rail would show two lit tiles and neither
 * would mean anything.
 *
 * @param {Object} ui
 * @param {String|null} active
 * @returns {Array}
 */
const navItems = (ui, active, opt = {}) =>
  [
    // ORG-HOME ONLY. Dept. is the org's rail entry and the only one those
    // frames show; the workspace rail does not have it — the desk's own
    // createRailNav is Files/Chat/Task/Meet/Access and nothing else, and
    // 176:42043 shows the same five. It used to be rendered always and merely
    // unlit, which put a sixth entry on a rail the product has five of.
    active ? null : orgOnly(() =>
      railItem(ui, "rail-department", LOCALE.DEPARTMENT, { active: true }),
    ),
    ...railItems(ui, active, opt),
  ].filter(Boolean);

const nav = (ui, active) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-nav`,
    sys_pn: "rail-nav",
    partHandler: ui,
    kids: navItems(ui, active),
  });
};

const footer = (ui) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-footer`,
    kids: [
      railItem(ui, "rail-invite", LOCALE.INVITE),
      railItem(ui, "rail-plan", LOCALE.PLAN),
    ],
  });
};

/**
 * @param {Object} ui  the tutorial host
 * @param {Object} [opt]
 * @param {String} [opt.active] rail entry to light, or null/absent for the
 *   org-home rail, which has no workspace tabs at all
 */
module.exports = function (ui, opt = {}) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-main`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-top`,
        kids: [logo(ui), nav(ui, opt.active || null)],
      }),
      footer(ui),
    ],
  });
};

module.exports.railItems = railItems;
module.exports.navItems = navItems;

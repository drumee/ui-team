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
  return Skeletons.Box.Y({ active: 0,
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
const railItems = (ui, active) => {
  return active
    ? [
        railItem(ui, "rail-files", LOCALE.FILES, { active: active === "files" }),
        railItem(ui, "rail-chat", LOCALE.CHAT, { active: active === "chat" }),
        railItem(ui, "rail-task", LOCALE.TASK, { active: active === "task" }),
        railItem(ui, "rail-meet", LOCALE.MEET, { active: active === "meet" }),
        railItem(ui, "rail-access", LOCALE.ACCESS, { active: active === "access" }),
      ]
    : [];
};

/**
 * The rail's middle SLOT. The items inside it are re-fed per step by the host
 * (tutorial/index.js _applyChrome), so this returns the container and
 * `railItems` returns what goes in it — handing the container back from both
 * would feed an __sb-nav into the __sb-nav slot and nest a duplicate.
 */
const nav = (ui, active) => {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-nav`,
    sys_pn: "rail-nav",
    partHandler: ui,
    kids: [
      // Departments are the org's own rail entry, and the only one the
      // org-home frames show. Gated off until org ships — see ./org.js.
      orgOnly(() => railItem(ui, "rail-department", LOCALE.DEPARTMENT)),
      ...railItems(ui, active),
    ].filter(Boolean),
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

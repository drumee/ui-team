/**
 * @license
 * Copyright 2024 Thidima SA. All Rights Reserved.
 * Licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/**
 * Live privilege changes pushed over the wire.
 *
 * When an admin changes a member's role, the server (hub.set_privilege) pushes
 * { privilege, hub_id, area } to that member's own sockets. Widgets that cached
 * the privilege at mount time keep acting on the stale value until they are
 * told otherwise — a viewer downgraded mid-session still sees edit affordances
 * and still enters edit mode on reopen.
 *
 * This module holds the guard logic every such widget needs. It is deliberately
 * DOM-free: what a widget does about the change (re-feed a topbar, freeze an
 * editor, gate a chat panel) differs per widget, so that part arrives as hooks.
 *
 * The folder window carries its own copy of this logic (see
 * window/folder/index.js `_applyLivePrivilege`). It is intentionally left alone
 * for now — it works, and moving a live surface onto a fresh helper buys a
 * regression risk with no user-visible gain. Migrate it once a second consumer
 * has exercised this module.
 */

/**
 * The "write" bit distinguishes Edit-and-above from View / View & chat.
 *
 * Roles compose these bits (see builtins/skeleton/toolkit/permission.js):
 *   view  0b0000011 · chat 0b0000111 · edit 0b0001111 · admin 0b0011111
 * so testing the single write bit (_K.permission.write === 0b0001000, see
 * lex/constants.js) answers "may this user still change the document?" without
 * caring which of the higher roles they hold.
 *
 * @param {number|string} priv privilege bitmask
 * @returns {boolean}
 */
function hasWriteBit(priv) {
  return !!(Number(priv) & _K.permission.write);
}

/**
 * Apply a privilege pushed by hub.set_privilege to a widget's model.
 *
 * Returns false without touching anything when the payload is not ours to act
 * on, so callers can use the return value to skip their own follow-up work.
 *
 * @param {Object} ui     widget instance (needs mget/mset)
 * @param {Object} data   WS payload: { privilege, hub_id, area }
 * @param {Object} hooks  optional callbacks, each (prevPriv, nextPriv):
 *                          onChange    — any change at all
 *                          onDowngrade — write bit lost (Edit → View/Chat)
 *                          onUpgrade   — write bit gained (View/Chat → Edit)
 * @returns {boolean} true when the privilege actually changed
 */
function applyLivePrivilege(ui, data = {}, hooks = {}) {
  if (!ui || typeof ui.mget !== "function") return false;

  const { privilege, hub_id } = data || {};
  if (privilege == null) return false;

  // A user can have several windows open at once, each on a different hub, and
  // every one of them hears every push. Only react to our own hub. The payload
  // omits hub_id in some paths, so an absent value is treated as "ours".
  if (hub_id && hub_id !== ui.mget(_a.hub_id)) return false;

  const prev = ui.mget(_a.privilege);
  const next = Number(privilege);

  // Re-sending the same privilege is common (batch role updates touch every
  // member). Bailing here keeps callers from re-feeding parts for no reason,
  // which would flicker the UI.
  if (Number(prev) === next) return false;

  ui.mset(_a.privilege, next);

  const lostWrite = hasWriteBit(prev) && !hasWriteBit(next);
  const gainedWrite = !hasWriteBit(prev) && hasWriteBit(next);

  if (typeof hooks.onChange === "function") hooks.onChange(prev, next);
  if (lostWrite && typeof hooks.onDowngrade === "function") {
    hooks.onDowngrade(prev, next);
  }
  if (gainedWrite && typeof hooks.onUpgrade === "function") {
    hooks.onUpgrade(prev, next);
  }

  return true;
}

module.exports = { applyLivePrivilege, hasWriteBit };

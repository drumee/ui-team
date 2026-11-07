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
 * The disconnect screen — after Sign out, and after "Back to sign in" on the
 * analytics authorization card.
 *
 * THE BOOT WARM-UP PICTURE, not a card (2026-11-07). Sign-out from an org host
 * ends in a real page load on the main domain, and that load shows the boot
 * warm-up (server-team client/templates/warmup.html). With the old sign-in
 * card here, one sign-out showed two different loading screens back to back
 * (recording 2026-11-07 07:07, 0:07.5 card → 0:09.5 warm-up). Drawn as the
 * warm-up — same backdrop, lockup, track and fill, same place — the two are
 * one screen continuing.
 *
 * `sys_pn: "disconnected"` IS LOAD-BEARING. Butler.logout awaits
 * ensurePart('disconnected') before it posts drumate.logout, so renaming or
 * dropping that part stops logout mid-flight: overlay up, session never
 * ended, nothing logged. Same for the loader part. It now carries the
 * message for screen readers only (visually hidden in skin/goodbye.scss).
 */
const LOGO = require("assets/drumee-logo.svg");

const __skl_goodbye = function (_ui_) {
  const fig = `${_ui_.fig.family}-goodbye`;
  const logo = LOGO.default || LOGO;

  // The message, for assistive tech: the warm-up picture has no caption.
  const header = Skeletons.Box.X({
    className: `${fig}__header`,
    sys_pn: "disconnected",
    attrOpt: { role: "status", "aria-live": "polite" },
    kids: [
      Skeletons.Note({
        className: `${fig}__note`,
        content: LOCALE.GOODBYE_SEE_YOU_LATER,
      }),
    ],
  });

  // The warm-up bar: #d8d6f3 track, #433cc5 fill, driven by
  // Butler._logoutProgress through `goodbye-progress`.
  const bar = Skeletons.Box.Y({
    className: `${fig}__container`,
    sys_pn: _a.loader,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__progress`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__progress-fill`,
            sys_pn: "goodbye-progress",
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__main`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__stack`,
        kids: [
          Skeletons.Element({
            className: `${fig}__logo`,
            content: `<img src="${logo}" alt="drumee" width="160" height="32">`,
          }),
          bar,
          header,
        ],
      }),
    ],
  });
};

module.exports = __skl_goodbye;

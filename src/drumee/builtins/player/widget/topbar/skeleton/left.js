// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/skeleton/left
//   TYPE : Skeleton
// ==================================================================== *

/**
 * The topbar's identity block: a file-type tile and the title beside it.
 *
 * Both halves are optional — a module with no type icon passes only a
 * title, and vice versa. With neither, the whole block is omitted so the
 * action row is not pushed off its edge by an empty flex child.
 *
 * `sys_pn: "player-title"` is fixed rather than derived: player chrome
 * looks the part up by that exact name (player/interact.js).
 *
 * @param {object} ctx   { ui, cn, wcn, group }
 * @param {object} left  { fileTypeIcon, title }
 */
const __player_topbar_left = function (ctx, left) {
  if (!left) return null;

  const { ui, cn, wcn, group } = ctx;
  const kids = [];

  if (left.fileTypeIcon) {
    kids.push(
      Skeletons.Box.X({
        className: `${cn}__filetype ${wcn}__filetype`,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: left.fileTypeIcon,
            className: `${cn}__filetype-icon ${wcn}__filetype-icon`,
          }),
        ],
      }),
    );
  }

  if (left.title != null) {
    kids.push(
      Skeletons.Note({
        className: `${group}__title ${wcn}__title`,
        sys_pn: "player-title",
        content: left.title,
        service: _e.raise,
        uiHandler: ui,
      }),
    );
  }

  if (!kids.length) return null;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${cn}__identity ${wcn}__identity`,
    service: _e.raise,
    uiHandler: ui,
    kids,
  });
};

module.exports = __player_topbar_left;

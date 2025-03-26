/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ======================================================
// 
// ======================================================
const __window_fileinfo = function(_ui_){

  let changed, created;
  const ctime = _ui_.model.get(_a.createTime);
  if (ctime != null) {
    created = Dayjs.unix(ctime).format("DD/MM/YYYY");
  } else { 
    created = "";
  }
  const mtime = _ui_.model.get("mtime");
  if (mtime != null) {
    changed = Dayjs.unix(mtime).format("DD/MM/YYYY");
  } else { 
    changed = "";
  }

  const itemClass = `${_ui_.fig.group}__info-item`;
  const menuClass = `${_ui_.fig.group}__info-item`;
  const a = {
    kind      : KIND.box,
    debug     : __filename,
    className : `${_ui_.fig.group}__info-items h-100 u-jc-center`, 
    flow      : _a.vertical,
    styleOpt  : {
      width   : 180
    },
      // height  : 109
    kids      : [
      Skeletons.Box.X({
        className: "u-jc-sb",
        kidsOpt   : {
          className : menuClass
        },
        kids: [
         Skeletons.Note(LOCALE.LAST_ACCESS + ":", {className : itemClass}),
         Skeletons.Note(LOCALE.COMING_SOON)//"Comming soon")
        ]
      }),
      Skeletons.Box.X({
        className: "u-jc-sb",
        kidsOpt   : {
          className : menuClass
        },
        kids: [
         Skeletons.Note(LOCALE.UPLOAD_TIME + ":", {className : itemClass}),
         Skeletons.Note(created)
        ]
      }),

      Skeletons.Box.X({
        className: "u-jc-sb",
        kidsOpt   : {
          className : menuClass
        },
        kids: [
         Skeletons.Note(LOCALE.LAST_CHANGE + ":", {className : itemClass}),
         Skeletons.Note(changed)
        ]
      }),

      Skeletons.Box.X({
        className: "u-jc-sb",
        kidsOpt   : {
          className : menuClass
        },
        kids: [
         Skeletons.Note(LOCALE.SIZE + ":", {className : itemClass}),
         Skeletons.Note(_ui_.model.get(_a.geometry))
        ]
      }),

      Skeletons.Box.X({
        className: "u-jc-sb",
        kidsOpt   : {
          className : menuClass
        },
        kids: [
         Skeletons.Note(LOCALE.WEIGHT + ":", {className : itemClass}),
         Skeletons.Note(_ui_.model.get(_a.size))
        ]
      })
    ]
  };
  return a;
};
module.exports = __window_fileinfo;

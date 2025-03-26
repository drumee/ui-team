const { filesize } = require("core/utils")

/**
 * 
 * @param {*} _ui_ 
 * @param {*} opt 
 * @returns 
 */
const __bar = function (_ui_, opt) {
  const fig = `${_ui_.fig.family}`
  let blocks = [];
  let el;
  let disk = opt.disk;
  for (var type of opt.types) {
    let p = 100 * disk[type] / opt.used;
    el = Skeletons.Element({
      className: `${fig}__block bar ${type}`,
      sys_pn: `used-${type}`,
      style: {
        width: `${p}%`
      }
    })
    blocks.push(el);
  }

  let width = opt.width;
  if (width < 0) width = 0;
  if (width > 100) width = 100;
  let content = Skeletons.Box.X({
    className: `${fig}__blocks-bar-container`,
    kids: blocks,
    style: {
      width: `${width}%`
    }
  })

  return Skeletons.Box.X({
    className: `${fig}__blocks bar`,
    kids: [
      content,
      Skeletons.Note({
        className: `${fig}__quota`,
        content: filesize(disk.quota_disk)
      }),
      Skeletons.Box.X({
        className: `${fig}__rules` 
      }),
    ],
  })
}

/**
 * 
 * @param {*} _ui_ 
 * @param {*} opt 
 * @returns 
 */
const __detail = function (_ui_, opt) {
  const TYPES = {
    desk: LOCALE.DESK,
    chat: LOCALE.CHAT,
    private: LOCALE.TEAM_ROOM,
    share: LOCALE.SHARE_BOX
  };
  const fig = `${_ui_.fig.family}`
  let blocks = [];
  let el;
  let disk = opt.disk;
  for (var type of opt.types) {
    el = Skeletons.Box.Y({
      className: `${fig}__block detail ${type}`,
      kids: [
        Skeletons.Note({
          className: `${fig}__capacity`,
          content: TYPES[type]
        }),
        Skeletons.Note({
          className: `${fig}__capacity`,
          content: filesize(disk[type])
        })
      ]
    })
    blocks.push(el)
  }
  return Skeletons.Box.X({
    className: `${fig}__blocks detail`,
    kids: blocks
  })
}

const __properties = function (_ui_, disk) {
  const fig = `${_ui_.fig.family}`
  //let disk = _ui_.data;
  let used = 1;
  let types = _.keys(disk).filter(function (e) {
    return (!/^quota/.test(e))
  });
  for (var type of types) {
    used = used + disk[type];
  }
  let p = 100 * used / disk.quota_disk;
  let opt = { disk, used, types, width: p };
  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__main`,
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        content: _ui_.plan
      }),
      __bar(_ui_, opt),
      Skeletons.Box.X({
        className: `${fig}__blocks cursor`,
        kids: [
          Skeletons.Note({
            className: `${fig}__block cursor`,
            //sys_pn: `cursor`,
            content: filesize(used),
            style: {
              left: `${p}%`
            }
          })
        ]
      }),
      __detail(_ui_, opt)
    ]
  });

  return a;
};

module.exports = __properties;

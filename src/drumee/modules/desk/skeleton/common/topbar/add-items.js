// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/builtins/desk/skeleton/top-bar/add-items
//   TYPE :
// ==================================================================== *

const __desk_top_bar_add_items = function(_ui_) {

  const pfx = "desk-topbar__menu-item";
  const a = {
    kind: KIND.box,
    className: "u-ai-center u-jc-sb desk__menu__container-plus",
    flow: _a.horizontal,
    debug     : __filename,
    kids: [
      Skeletons.Button.Label({
        ico       : "drumee-add-contact",
        label     : LOCALE.CONTACT,
        className : `${pfx} green big`,
        service   : 'contact',
        type      : 'contact'
      }),

      Skeletons.Button.Label({
        ico : "drumee-folder",//"row-folder"
        label: LOCALE.FOLDER,
        className: `${pfx} folder big`,
        service: "add-folder"
      }),

      Skeletons.Button.Label({
        ico : "drumee_projectroom",
        label: LOCALE.TEAM_ROOM, //LOCALE.SHARE_ROOM
        className: `${pfx} violet big`,
        service: 'add-project'
      }),

      Skeletons.Button.Label({
        ico : "drumee_projectroom",
        label: 'Share Room', //LOCALE.SHARE_ROOM
        className: `${pfx} orange big sharebox`,
        service: 'add-sharebox'
      }),

      Skeletons.Button.Label({
        ico : "drumee-site",
        label: LOCALE.WEBSITE, //LOCALE.WEBSITE
        tooltips: {
          content : LOCALE.NOT_YET_IMPLEMENTED
        },
        className: `${pfx} hub`
      }),
        //service: 'add-website'

      Skeletons.Button.Label({
        ico       : "drumee-write",//"raw-drumee-write"
        label     : LOCALE.TEXT,
        tooltips  : {
          content : LOCALE.COMING_SOON
        },
        className : `${pfx} text tbd`
      }),

      Skeletons.Button.Label({
        ico       : "drumee-slide",
        label     : LOCALE.SLIDES,
        tooltips  : {
          content : LOCALE.COMING_SOON
        },
        className : `${pfx} slide tbd`
      })

    ]
  };
  a.kids.plug(_a.debug, __filename);
  return a;
};

module.exports = __desk_top_bar_add_items;

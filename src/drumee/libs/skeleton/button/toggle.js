/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/toggle
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// __btn_toogle
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __btn_toogle = function(key, ext, pictos) {
    if (key == null) { key = _a.toggle; }
    const a= {
      slide: {
        className : "cursor-pointer",
        label:_K.string.empty,
        service : _e.slide,
        state: 1,
        pictos: {
          1: _p.angle.left,
          0: _p.angle.right
        }
      },
      preview: {
        className : "cursor-pointer",
        label:_K.string.empty,
        service : _e.preview,
        state: 0,
        pictos: {
          0: _p.eye,
          1: _p.eye_slash
        }
      },
      user: {
        className : "cursor-pointer",
        label:_K.string.empty,
        service : _a.user,
        state: 0,
        pictos: {
          0: _p.users,
          1: _p.user
        }
      },
      preview: {
        className : "cursor-pointer",
        label:_K.string.empty,
        service : _e.preview,
        state: 0,
        pictos: {
          0: _p.eye,
          1: _p.eye_slash
        }
      },
      play: {
        className : "cursor-pointer",
        label:_K.string.empty,
        service : _a.play,
        label:LOCALE.PLAY,
        state: 0,
        pictos: {
          1: _p.picture,
          0: _p.picture
        }
      },
      contextmenu: {
        label:LOCALE.CONTEXTMENU,
        state: 1,
        service : _e.contextmenu,
        pictos: {
          0: _p.toggle_off,
          1: _p.toggle_on
        }
      },
      toggle: {
        label:LOCALE.CONTEXTMENU,
        state: 0,
        service : _e.toggle,
        pictos: {
          0: _p.toggle_off,
          1: _p.toggle_on
        }
      },
      trash: {
        label:_K.string.empty,
        service : _e.sort,
        state: 1,
        pictos: {
          1: _p.trashOn,
          0: _p.trashOff
        }
      },
      no_picto: {
        label:_K.string.empty,
        state: 0
      },
      base: {
        label:_K.string.empty,
        state: 0
      },
      sort: {
        label:_K.string.empty,
        service : _e.sort,
        state: 1,
        pictos: {
          1: _p.sortAsc,
          0: _p.sortDesc
        }
      }
    };
    a[key] = a[key] || a.no_picto;
    a[key].kind = KIND.button.toggle;
    a[key].signal = _e.ui.event;
    a[key].className = a[key].className;
    if ((a[key].service == null)) {
      a[key].service = key;
    }
    if (_.isObject(ext)) {
      _.extend(a[key], ext);
    }
    if (_.isObject(pictos)) {
      _.extend(a.pictos, pictos);
    }
    return a[key];
  };
module.exports = __btn_toogle;
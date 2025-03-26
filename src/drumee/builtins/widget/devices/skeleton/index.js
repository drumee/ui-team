// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/conference/device/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/
const _device_name = { 
  videoinput  : LOCALE.CAMERA, 
  audioinput  : LOCALE.MICROPHONE,
  audiooutput : LOCALE.SPEAKERS
};

const _trigger = function(_ui_) {
  const ico = { 
    videoinput  : "video-camera",
    audioinput  : "micro",
    audiooutput : "speaker"
  };
  const a = Skeletons.Button.Svg({
    ico         : 'editbox_cog',
    className   : `${_ui_.fig.family}__icon editbox_cog`
  });
  return a; 
};

const _devices = function(_ui_, devices, type) {
  let tracks;
  const a = [];
  devices = _.groupBy(devices, 'groupId');
  const radio   = _.uniqueId(`${type}-`)*
  _ui_.mget(_a.stream) ?
    (tracks = _ui_.mget(_a.stream).getTracks()) : undefined;
  for (var k in devices) {
    var v = devices[k];
    var item = {};
    this.debug("JJJJ DEVICES 40  =>", v);
    var object = v[0].toJSON();
    for (var kk in object) {
      var vv = object[kk];
      item[kk] = vv;
    }
    item.type  = item.kind;
    item.kind  = 'media_device';
    item.radio = radio;
    //item.uiHandler = _ui_
    // item.signal    = "device:select"
    item.service = _e.select;
    item.tracks  = tracks;
    a.push(item);
  }

  //@debug "JJJJ DEVICES 40  =>", devices, a
  return a;
};

const _items = function(_ui_) {
  const devices = _.groupBy(_ui_.mget('devices'), _a.kind);
  //@debug "JJJJ DEVICES  45 =>", devices
  const devices_type = [];
  const devices_list = [];
  const radio_type   = _.uniqueId("type-");
  const radio_list   = _.uniqueId("list-");
  for (var type in devices) {
    var list = devices[type];
    this.debug(`JJJJ DEVICES  45 => type=${type}`, list);
    devices_type.push(Skeletons.Note({
      className : `${_ui_.fig.family}__tab`,
      content   : _device_name[type],
      service   : 'tab',
      type,
      radio     : radio_type,
      state     : toggleState(type === 'audioinput'),
      uiHandler : _ui_
    })
    );
    devices_list.push(Skeletons.Box.Y({
      className : `${_ui_.fig.family}__category ${type}`,
      state     : toggleState(type === 'audioinput'),
      sys_pn    : type,
      radio     : radio_list,
      kids      : _devices(_ui_, list, type),
      partHandler : _ui_
    })
    );
  } 

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__list`,
    kids :[
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__topbar`,
        kids      : devices_type
      }),
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__list`,
        kids      : devices_list
      })
    ]});
  this.debug("JJJJ DEVICES  80", a);
  return a; 
};

// ===========================================================
//
// ===========================================================
const __skl_conference_device = function(_ui_) {
  const a = { 
    kind        : KIND.menu.topic,
    className   : `${_ui_.fig.family}__main ${_ui_.mget(_a.type)}`,
    persistence : _a.toggle, //
    flow        : _a.y,
    direction   : _a.down,
    axis        : _a.y,
    opening     : _e.click,
    // persistence : _a.self 
    trigger     : _trigger(_ui_),
    items       : _items(_ui_)
  };

  return a;
};
module.exports = __skl_conference_device;
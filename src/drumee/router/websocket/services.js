const _sig = function (module_name, method_name, d) {
  switch (method_name) {
    case 'notify':
      return { bell: 1, silent: 1, event: `${module_name}.${method_name}` };
    case 'dial':
      return { ring: 1, silent: 1, event: `${module_name}.${method_name}` };
    default:
      return { bell: d.notify, event: module_name };
  }
};

const __services_map = function (module_name, method_name, d) {
  if (d == null) { d = {}; }
  const m = {
    hub: {
      event: _a.media,
      bell: 1
    },
    desk: {
      event: _a.media,
      bell: 1
    },
    channel: {
      event: _a.channel,
      bell: 1,
      url: `${_K.module.desk}/wm/open/nid=0&hub_id=${d.hub_id}&type=channel&single=type,hub_id`
    },
    chat: {
      event: _a.chat,
      bell: 1,
      silent: method_name === 'acknowledge'
    },
    meeting: {
      event: module_name,
      bell: 1,
      url: `${_K.module.desk}/wm/open/kind=window_meeting/nid=*&hub_id=${d.hub_id}`
    },
    sharebox: {
      event: _a.share,
      bell: 1
    },
    signaling: _sig(module_name, method_name, d),
    sys: {
      event: _a.sys,
      bell: 0
    }
  };
  let a = m[module_name];
  if (!a) {
    a = {
      event: module_name,
      bell: 0,
      silent: 1
    };
  }
  return a;
};
module.exports = __services_map;

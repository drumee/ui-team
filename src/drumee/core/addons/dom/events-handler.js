
// window._B = Backbone.Radio.channel('broadcast')
window.RADIO_CLICK = Backbone.Radio.channel('click');
window.RADIO_MEDIA = Backbone.Radio.channel('media');
window.RADIO_MOUSE = Backbone.Radio.channel('mouse');
window.RADIO_KBD = Backbone.Radio.channel('keyboard');
window.RADIO_NETWORK = Backbone.Radio.channel('network');
window.RADIO_BROADCAST = Backbone.Radio.channel('broadcast');
window.CHAT_ROOM = Backbone.Radio.channel('chat_room');


let _lastTarget = null;
let _lastCoords = {};

window.lastClick = {};
window.lastDblClick = {};
const initialize = function (opt) {
  const __mousedown = function (e) {
    _lastTarget = e.target;
    _lastCoords = {
      x: e.clientX + e.offsetX,
      y: e.clientY + e.offsetY
    };
    return RADIO_MOUSE.trigger(_e.mousedown, e);
  };

  const __mousemove = e => RADIO_MOUSE.trigger(_e.mousemove, e);

  const __mouseup = function (e) {
    const l = _lastTarget;
    const dx = Math.abs((e.clientX + e.offsetX) - _lastCoords.x);
    const dy = Math.abs((e.clientY + e.offsetY) - _lastCoords.y);
    window.mouseDragged = false;
    window.sameTargetClicked = (e.target === l);
    if (sameTargetClicked) {
      window.mouseDragged = ((dx > 5) || (dy > 5));
    }
    RADIO_MOUSE.trigger(_e.mouseup, e);
    return window.lastClick = e;
  };

  const __mouseout = e => RADIO_MOUSE.trigger(_e.mouseout, e);

  const __mouseenter = e => RADIO_MOUSE.trigger(_e.mouseenter, e);

  const __mouseleave = e => RADIO_MOUSE.trigger(_e.mouseleave, e);

  const __keydown = function (e) {
    RADIO_BROADCAST.trigger(_e.keydown, e);
    return RADIO_KBD.trigger(_e.keydown, e);
  };

  const __keyup = function (e) {
    RADIO_BROADCAST.trigger(_e.keyup, e);
    RADIO_KBD.trigger(_e.keyup, e);
    return window.mouseDragged = false;
  };



  const __click = function (e) {
    RADIO_BROADCAST.trigger(_e.click, e);
    return window.lastClick = e;
  };

  const __scroll = e => RADIO_BROADCAST.trigger(_e.scroll, e);

  const __nodrop = function (e) {
    e.preventDefault();
    return true;
  };

  const __resize = function (e) {
    window.mouseDragged = true;
    if (e.srcElement != window) return
    RADIO_BROADCAST.trigger(_e.responsive, window.innerWidth);
    return true;
  };

  const __clipboard = evt => true;

  const __orientation = function (evt) {
    window.DeviceOrientation = evt;
  };

  const __error = function (evt) {
    console.log("AAA:94 -- CAUGHT ERROR", evt);
  };

  document.addEventListener(_e.keyup, __keyup, false);
  document.addEventListener(_e.keydown, __keydown, false);
  document.addEventListener(_e.click, __click, false);
  document.addEventListener(_e.mouseup, __mouseup, false);
  document.addEventListener(_e.mousemove, __mousemove, false);
  document.addEventListener(_e.mousedown, __mousedown, false);
  document.addEventListener(_e.mouseenter, __mouseenter, false);
  document.addEventListener(_e.mouseleave, __mouseleave, false);
  document.addEventListener(_e.mouseout, __mouseout, false);
  document.addEventListener(_e.copy, __clipboard, false);
  document.addEventListener(_e.error, __error, false);

  document.body.addEventListener(_e.dragover, __nodrop);
  document.body.addEventListener(_e.drop, __nodrop);

  window.onscroll = __scroll;
  window.onresize = _.throttle(__resize, 500, { maxWait: 5000, trailing: true }); //{trailing:true})

  window.Connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (typeof Connection !== 'undefined' && Connection !== null) {
    Connection.addEventListener(_e.change, function (e) {
      return RADIO_NETWORK.trigger(_e.change, e);
    });
  }

  window.addEventListener(_e.offline, function (e) {
    return RADIO_NETWORK.trigger(_e.offline, e);
  });

  window.addEventListener(_e.online, function (e) {
    return RADIO_NETWORK.trigger(_e.online, e);
  });

  window.addEventListener("deviceorientation", __orientation);
  
};
export default initialize();
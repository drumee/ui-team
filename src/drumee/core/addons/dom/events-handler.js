
// window._B = Backbone.Radio.channel('broadcast')
window.RADIO_CLICK = Backbone.Radio.channel('click');
window.RADIO_MEDIA = Backbone.Radio.channel('media');
window.RADIO_POINTER = Backbone.Radio.channel('pointer');
window.RADIO_KBD = Backbone.Radio.channel('keyboard');
window.RADIO_NETWORK = Backbone.Radio.channel('network');
window.RADIO_BROADCAST = Backbone.Radio.channel('broadcast');
window.CHAT_ROOM = Backbone.Radio.channel('chat_room');


let _lastTarget = null;
let _lastCoords = {};

window.lastClick = {};
window.lastDblClick = {};
const initialize = function (opt) {
  const __pointerdown = function (e) {
    _lastTarget = e.target;
    _lastCoords = {
      x: e.clientX + e.offsetX,
      y: e.clientY + e.offsetY
    };
    return RADIO_POINTER.trigger(_e.pointerdown, e);
  };

  const __pointermove = e => RADIO_POINTER.trigger(_e.pointermove, e);

  const __pointerup = function (e) {
    const l = _lastTarget;
    const dx = Math.abs((e.clientX + e.offsetX) - _lastCoords.x);
    const dy = Math.abs((e.clientY + e.offsetY) - _lastCoords.y);
    window.pointerDragged = false;
    window.sameTargetClicked = (e.target === l);
    if (sameTargetClicked) {
      window.pointerDragged = ((dx > 5) || (dy > 5));
    }
    RADIO_POINTER.trigger(_e.pointerup, e);
    return window.lastClick = e;
  };

  const __pointerout = e => RADIO_POINTER.trigger(_e.pointerout, e);

  const __pointerenter = e => RADIO_POINTER.trigger(_e.pointerenter, e);

  const __pointerleave = e => RADIO_POINTER.trigger(_e.pointerleave, e);

  const __keydown = function (e) {
    RADIO_BROADCAST.trigger(_e.keydown, e);
    return RADIO_KBD.trigger(_e.keydown, e);
  };

  const __keyup = function (e) {
    RADIO_BROADCAST.trigger(_e.keyup, e);
    RADIO_KBD.trigger(_e.keyup, e);
    return window.pointerDragged = false;
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
    window.pointerDragged = true;
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
  document.addEventListener(_e.copy, __clipboard, false);
  document.addEventListener(_e.error, __error, false);

  if (window.PointerEvent) {
    document.addEventListener(_e.pointerup, __pointerup, false);
    document.addEventListener(_e.pointermove, __pointermove, false);
    document.addEventListener(_e.pointerdown, __pointerdown, false);
    document.addEventListener(_e.pointerenter, __pointerenter, false);
    document.addEventListener(_e.pointerleave, __pointerleave, false);
    document.addEventListener(_e.pointerout, __pointerout, false);
  } else {
    document.addEventListener(_e.mouseup, __pointerup, false);
    document.addEventListener(_e.mousemove, __pointermove, false);
    document.addEventListener(_e.mousedown, __pointerdown, false);
    document.addEventListener(_e.mouseenter, __pointerenter, false);
    document.addEventListener(_e.mouseleave, __pointerleave, false);
    document.addEventListener(_e.mouseout, __pointerout, false);
  }

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
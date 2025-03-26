const __skl_thread_grid = function(view, service, hubtype) {
  let hub_id;
  if (service == null) { service = "change-image"; }
  if (hubtype === undefined) {
    hub_id = _K.ident.cdn;
  } else if (hubtype === 'tunnel') {
    hub_id = _K.ident.cdn;
  } else if (hubtype === 'drumate') {
    hub_id = Host.id;
  } else if (hubtype === 'computer') {
    hub_id = Host.id;
  } else { 
    _dbg("unknown hubtype");
  }

  const list = {
    kind      : Skeletons.List.Smart,
    className : "full images-list",
    flow      : _a.none,
    vendorOpt : {
      alwaysVisible : true,
      size          : "2px",
      opacity       : "1",
      color         : "#FA8540",
      distance      : "0",
      allowPageScroll : true
    },
    itemsOpt : {
      kind          : KIND.image.core,
      signal        : _e.ui.event,
      service,
      handler       : {
        ui          : view
      }
    },
    api     : {
      service : SERVICE.media.get_by_type,
      page   : 1,
      type   : _a.image,
      order  : _K.order.descending,
      hub_id
    } 
  };

  const a = {
    kind:KIND.box,
    className : "editbox-image-grid editbox-image-grid--with-slider",
    styleOpt  : {
      height    : 298
    },
    flow: _a.wrap,
    kids:[list]
  };
  
  return a;
};
module.exports = __skl_thread_grid;

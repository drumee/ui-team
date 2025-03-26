const __sandbox_images_list = function (view, oid) {
  if (oid == null) { oid = _K.ident.cdn; }
  const list = {
    kind: KIND.list.smart,
    flow: _a.vertical,
    style: {
      width: "100%",
      height: window.innerHeight - 150
    },
    className: "mb-45",
    innerClass: "images-list",
    minPage: 2,
    itemsOpt: {
      kind: KIND.media.preview,
      className: "preferences__wallpapers",
      format: _a.card,
      style: {
        width: 147,
        height: 90
      }
    },
    api: {
      service: SERVICE.media.show_node_by,
      page: 1,
      type: _a.image,
      nid: '/deskbackgrounds',
      vhost: `tunnel.${bootstrap().main_domain}`
    }
  };
  const a = SKL_Box_V(view, {
    className: "sandbox--wrapper",
    tips: "Can you explain where do the images come from ? How?",
    kids: [list]
  });
  return a;
};
module.exports = __sandbox_images_list;

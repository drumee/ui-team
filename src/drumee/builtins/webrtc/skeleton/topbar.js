module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const name = _ui_.mget(_a.name) || _ui_.mget(_a.filename) || "";

  return Skeletons.Box.X({
    className: `${pfx}__in-topbar`,
    kids: [
      Skeletons.Image.Svg({ ico: "folder-meeting", className: `${pfx}__in-topbar-icon` }),
      Skeletons.Note({ className: `${pfx}__in-topbar-title`, content: name, sys_pn: "call-title" }),
      Skeletons.Note({ className: `${pfx}__in-topbar-timer`, content: "00:00", sys_pn: "elapsed-timer" }),
      Skeletons.Box.X({ className: `${pfx}__in-topbar-avatars`, sys_pn: "topbar-avatars" }),
    ],
  });
};

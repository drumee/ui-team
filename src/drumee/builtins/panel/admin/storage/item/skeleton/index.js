module.exports = function (ui) {
  const pfx      = ui.fig.family;
  const filename = ui.mget('filename') || '';
  const folder   = ui.mget('folder')   || '';
  const workspace= ui.mget('workspace')|| '';
  const size     = ui.mget('size')     || '';
  const versions = ui.mget('versions') || 0;
  const selected = ui.mget('selected') ? 1 : 0;
  const ico      = ui.mget('file_ico') || 'file';

  return Skeletons.Box.X({
    className: `${pfx}__row`,
    dataset: { selected },
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__checkbox`,
        icons: ['editbox_shapes-roundsquare', 'available'],
        sys_pn: 'checkbox',
        state: selected,
        service: 'toggle-select',
        uiHandler: [ui],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fcol file`,
        kids: [
          Skeletons.Image.Svg({ ico, className: `${pfx}__file-ico` }),
          Skeletons.Note({ className: `${pfx}__filename`, content: filename }),
        ],
      }),
      Skeletons.Box.X({ className: `${pfx}__fcol folder`,    kids: [Skeletons.Note({ className: `${pfx}__folder-tag`,    content: folder    })] }),
      Skeletons.Box.X({ className: `${pfx}__fcol workspace`, kids: [Skeletons.Note({ className: `${pfx}__workspace-tag`, content: workspace })] }),
      Skeletons.Note({ className: `${pfx}__fcol size`,      content: size }),
      Skeletons.Note({ className: `${pfx}__fcol versions`,  content: String(versions) }),
      Skeletons.Box.X({
        className: `${pfx}__fcol actions`,
        kids: [
          Skeletons.Button.Svg({ className: `${pfx}__more-btn`, ico: 'options_vert',  service: 'file-options', uiHandler: [ui] }),
          Skeletons.Button.Svg({ className: `${pfx}__del-btn`,  ico: 'tools_delete', service: 'delete-file',  uiHandler: [ui] }),
        ],
      }),
    ],
  });
};

module.exports = function(ui) {
  const pfx = `${ui.fig.group}-move`;
  const filename = ui._filename || '';
  const folderName = ui._folderName || LOCALE.FOLDER;
  const workspaceName = ui._workspaceName || LOCALE.WORKSPACE;
  const area = ui._area || 'inner-folder';

  // Inline folder SVG - same shape as grid view, colored via CSS var based on area
  const folderSvg = `<svg class="folder-shape ${area}" viewBox="0 0 105 86" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M33.5743 1.5H15C8.37258 1.5 3 6.87258 3 13.5V69C3 75.6274 8.37258 81 15 81H90C96.6274 81 102 75.6274 102 69L102 28.2C102 21.5726 96.6274 16.2 90 16.2H58.8349C55.8072 16.2 52.8913 15.0555 50.672 12.9959L41.7372 4.70411C39.5179 2.64453 36.6021 1.5 33.5743 1.5Z"/></svg>`;

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    radio: _a.parent,
    debug: __filename,
    kids: [
      // Header: title + close button
      Skeletons.Box.X({
        className: `${pfx}__topbar`,
        sys_pn: "topbar",
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: `Move "${filename}"`,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            service: _e.close,
            uiHandler: [ui],
            ico: 'cross',
          }),
        ],
      }),

      // Current location
      Skeletons.Box.Y({
        className: `${pfx}__section`,
        kids: [
          Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.CURRENT_LOCATION }),
          Skeletons.Box.X({
            className: `${pfx}__current-location`,
            kids: [
              // Inline SVG with area class - same visual as grid view
              Skeletons.Element({
                className: `${pfx}__folder-icon`,
                content: folderSvg,
              }),
              Skeletons.Box.Y({
                className: `${pfx}__location-info`,
                kids: [
                  Skeletons.Note({ sys_pn: "location-type", className: `${pfx}__location-type`, content: folderName }),
                  Skeletons.Note({ sys_pn: "location-path", className: `${pfx}__location-path`, content: workspaceName }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Destination search
      Skeletons.Box.Y({
        className: `${pfx}__section`,
        kids: [
          Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.SELECT_DESTINATION }),
          Skeletons.Box.Y({
            className: `${pfx}__search-bar`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__search-field`,
                kids: [
                  Skeletons.Entry({
                    sys_pn: "destination-search",
                    partHandler: ui,
                    className: `${pfx}__search-input`,
                    placeholder: LOCALE.SEARCH_WORKSPACE_OR_FOLDER,
                    uiHandler: [ui],
                  }),
                  Skeletons.Button.Svg({
                    className: `${pfx}__search-btn`,
                    service: 'browse-destination',
                    uiHandler: [ui],
                    ico: 'plus',
                  }),
                ],
              }),
              Skeletons.Box.X({
                sys_pn: "breadcrumb",
                partHandler: ui,
                className: `${pfx}__breadcrumb`,
                dataset: { state: 0 },
                kids: [],
              }),
              Skeletons.Box.Y({
                sys_pn: "suggestions",
                partHandler: ui,
                className: `${pfx}__suggestions`,
                dataset: { state: 1 },
                kids: [],
              }),
            ],
          }),
        ],
      }),

      // Move button
      Skeletons.Note({
        className: `${pfx}__move-btn button`,
        service: 'confirm-move',
        uiHandler: [ui],
        content: LOCALE.MOVE,
      }),
    ],
  });
};

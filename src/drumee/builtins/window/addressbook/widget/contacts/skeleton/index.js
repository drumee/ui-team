
module.exports = function (ui) {

  let tagName = LOCALE.ALL_CONTACTS;

  if (ui._currentTag && ui._currentTag.mget(_a.name)) {
    tagName = ui._currentTag.mget(_a.name);
  }

  const headerFig = `${ui.fig.family}-header`;
  const tagHeader = Skeletons.Box.X({
    className: headerFig,
    kids: [
      Skeletons.Note({
        className: `${headerFig}__title`,
        content: tagName
      })
    ]
  });

  const separator = Skeletons.Box.X({
    className: `${ui.fig.family}__separator`
  });

  const contentFig = `${ui.fig.family}-content`;
  const content = Skeletons.Box.X({
    className: contentFig,
    radio: 'contact_selected_' + ui.mget(_a.widgetId),
    isPlaceholder: true,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__items`,
        kids: [
          Skeletons.Box.X({
            className: `${contentFig}__item`,
            kids: [

              Skeletons.Button.Svg({
                ico: "editbox_list-circle",
                className: `${contentFig}__icon ${contentFig}__editbox_list-circle editbox_list-circle`,
                styleOpt: {
                  width: 29,//27 #22
                  height: 29
                }
              }),//27 #22

              Skeletons.Note({
                className: `${contentFig}__name`,
                content: LOCALE.NO_CONTACT
              })
            ]
          })
        ]
      })
    ]
  });

  const contactList = Skeletons.List.Smart({
    className: `${ui.fig.family}__item list`,
    placeholder: content,
    spinner: true,
    minPage: 3,
    //timer       : 200
    // spinnerWait : 2000
    itemsOpt: {
      kind: 'contact_item',
      service: 'show-contact-detail',
      radio: 'contact_selected_' + ui.mget(_a.widgetId),
      uiHandler: [ui]
    },
    sys_pn: "list-contacts",
    api: ui.getCurrentApi
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__contacts`,
    debug: __filename,
    kids: [
      tagHeader,
      separator,
      contactList
    ]
  });
};



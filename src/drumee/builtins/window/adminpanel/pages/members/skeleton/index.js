
function __skl_members_page(ui) {
  const membersFig = `${ui.fig.family}`;

  const mtags = {
    kind: 'widget_member_tags',
    className: 'widget_member_tags',
    orgId: ui.orgId
  };

  let a = Skeletons.Box.Y({
    className: `${membersFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${membersFig}__container`,
        kids: [
          require('./breadcrumbs').default(ui),
          require('./overlay-wrapper').default(ui),

          Skeletons.Box.X({
            className: `${membersFig}__wrapper members_tags tags`,
            sys_pn: 'members_tags',
            kids: [
              mtags
            ]
          }),

          Skeletons.Box.X({
            className: `${membersFig}__wrapper members_list list`,
            sys_pn: 'members_list',
            kids: [{
              kind: 'widget_members_list',
              className: 'widget_members_list',
              sys_pn: 'widget_members_list',
              type: 'allMembers',
              orgId: ui.orgId,
            }]
          }),

          Skeletons.Box.X({
            className: `${membersFig}__wrapper member_room room`,
            sys_pn: 'member_room',
            kids: []
          }),
        ]
      })
    ]
  })

  return a;
}

export default __skl_members_page;
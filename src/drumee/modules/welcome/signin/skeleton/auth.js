

function __skl_welcome_signin_auth(ui) {
  const fig = `${ui.fig.family}`;
  let dataset = ui.mget(_a.dataset) || {};
  let name = Organization.name();
  let headerTitle = (name.printf(LOCALE.CONNECTION_TO));

  const header = Skeletons.Box.Y({
    className: `${fig}__header-content`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${fig}__note header`,
        content: headerTitle,
        dataset,
      }),
    ]
  })

  if (Organization.get('domain_id') > 1) {
    header.kids.push(Skeletons.Note({
      className: `${fig}__note sub-header`,
      content: Organization.get(_a.url),
    }))
  }


  return {
    header,
    content: require('./content')(ui)
  };

};


module.exports = __skl_welcome_signin_auth;

/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_welcome_signin_auth(_ui_) {
  const fig = `${_ui_.fig.family}`;
  let dataset = _ui_.mget(_a.dataset) || {};
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
    content: require('./content')(_ui_)
  };

};


module.exports = __skl_welcome_signin_auth;

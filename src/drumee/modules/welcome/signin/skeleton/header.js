/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/modules/welcome/signin/skeleton/header.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_welcome_signin_header (_ui_, type = null) {
  const headerFig = _ui_.fig.family
  let dataset = _ui_.mget(_a.dataset) || {};
  
  const mode = _ui_._mode
  let name = Organization.name();

  // Header for drumee free - by default 
  let subTitle = "";
  let headerTitle = (name.printf(LOCALE.CONNECTION_TO));
  if(Organization.get('domain_id') > 1){
    // Header for Drumee pro Account 
    subTitle = Organization.get(_a.url) || name;
  }
 
  if (type == 'company-url') {
    headerTitle = LOCALE.PLEASE_ENTER_COMPANY_URL;
  }
  
  if (mode == _a.debug) {
    headerTitle = LOCALE.SOMETHING_WENT_WRONG
  }

  if (mode == _a.loader) {
    headerTitle = LOCALE.DRUMEE_DESK_OPENING
  }

  if(dataset.mode == 'reconnect'){
    headerTitle = LOCALE.SESSION_EXPIRED
    _ui_.mset({mode:dataset.mode})
  }
  const header = Skeletons.Box.Y({
    className  : `${headerFig}__header-content`,
    dataset,
    kids       : [
      Skeletons.Note({
        className  : `${headerFig}__note header`,
        content    : headerTitle,
        dataset,
      }),
      Skeletons.Note({
        className  : `${headerFig}__note sub-header`,
        content    : subTitle,
      })
    ]
  })
  
  return header;
}

module.exports = __skl_welcome_signin_header;
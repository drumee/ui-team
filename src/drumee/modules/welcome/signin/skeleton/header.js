

function __skl_welcome_signin_header(ui, type = null) {
  const headerFig = ui.fig.family;
  const dataset = ui.mget(_a.dataset) || {};

  const mode = ui._mode;
  const name = Organization.name();

  let headerTitle = name.printf(LOCALE.CONNECTION_TO);
  let subTitle = LOCALE.LOG_IN_TO_SOVEREIGN_WORKSPACE;

  if (Organization.get("domain_id") > 1) {
    subTitle = Organization.get(_a.url) || name;
  }

  if (type == "company-url") {
    headerTitle = LOCALE.PLEASE_ENTER_COMPANY_URL;
  }

  if (mode == _a.debug) {
    headerTitle = LOCALE.SOMETHING_WENT_WRONG;
  }

  if (mode == _a.loader) {
    headerTitle = LOCALE.DRUMEE_DESK_OPENING;
  }

  if (dataset.mode == "reconnect") {
    headerTitle = ui.mget("reconnect_title") || LOCALE.SESSION_EXPIRED;
    ui.mset({ mode: dataset.mode });
  }

  return Skeletons.Box.Y({
    className: `${headerFig}__header-content`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${headerFig}__note header`,
        content: headerTitle,
        dataset,
      }),
      Skeletons.Note({
        className: `${headerFig}__note sub-header`,
        content: subTitle,
        dataset,
      }),
    ],
  });
}

module.exports = __skl_welcome_signin_header;

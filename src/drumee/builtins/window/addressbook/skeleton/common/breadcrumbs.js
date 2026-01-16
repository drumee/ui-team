
const __topbar_breadcrumbs = function(ui) {

  const figFamily = `${ui.fig.family}-topbar-breadcrumbs`;

  
  const backButton = Skeletons.Button.Svg({
    ico       : "arrow--map",
    className : `${figFamily}__icon breadcrumb-icon back arrow--map`,
    service   : "previous-page",
    uiHandler : ui
  });

  const nextButton = Skeletons.Button.Svg({
    ico       : "arrow--map",
    className : `${figFamily}__icon breadcrumb-icon next arrow--map`,
    service   : "next-page",
    uiHandler : ui
  });
  
  const a = Skeletons.Box.X({
    debug       : __filename, 
    className   : `${figFamily}__container addressbook`,
    sys_pn      : "contact-breadcrumbs-container",
    partHandler : ui,
    state       : 0,
    kids        : [
      Skeletons.Box.X({
        kids: [
          backButton,
          nextButton
        ]})
    ]});

  return a;
};

module.exports = __topbar_breadcrumbs;


const __plan_item_row = function (_content, _ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;

  const planWrapper = Skeletons.Box.X({
    className: `${plansFig}__plan-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'desktop_check',
        className: `${plansFig}__icon bulletin company`,
      }),

      Skeletons.Note({
        className: `${plansFig}__note plan-item`,
        content: _content
      })
    ]
  })

  return planWrapper;
}


/**
 * @param {*} _ui_
*/
const __account_subscription_plan_company = function (_ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;

  const basicData = _ui_.data.plans.find((d) => { return d.plan == 'company' });
  const planDetail = basicData.plan_detail[0];

  const title = Skeletons.Box.X({
    className: `${plansFig}__title`,
    kids: [
      Skeletons.Note({
        className: `${plansFig}__note title company`,
        content: planDetail.plan
      })
    ]
  })

  const subTitle = Skeletons.Box.X({
    className: `${plansFig}__sub-title`,
    kids: [
      Skeletons.Note({
        className: `${plansFig}__note sub-title company`,
        content: LOCALE.ON_REQUEST
      })
    ]
  })

  const header = Skeletons.Box.Y({
    className: `${plansFig}__header`,
    kids: [
      title,
      subTitle
    ]
  })

  const featuresDesc = Skeletons.Box.X({
    className: `${plansFig}__features-desc`,
    kids: [
      Skeletons.Note({
        className: `${plansFig}__note features-desc`,
        content: LOCALE.GLOBAL_ENTERPRISE_MULTI_DESK
      })
    ]
  })

  const plansList = Skeletons.Box.Y({
    className: `${plansFig}__plans-list`,
    kids: [
      __plan_item_row(LOCALE.PRIVATE_URL_ADDRESS, _ui_),
      __plan_item_row(LOCALE.ONE_DESK_PER_EMPLOYEE, _ui_),
      __plan_item_row(LOCALE.LIMIT_PER_DESK, _ui_),
      __plan_item_row(LOCALE.NUMBER_OF_DESK_CUSTOMIZED, _ui_),
      __plan_item_row(LOCALE.CENTRAL_ADMIN_PANEL, _ui_),
      __plan_item_row(LOCALE.HOST_ON_COMPANY_SERVER, _ui_)
    ]
  })

  const plansContainer = Skeletons.Box.Y({
    className: `${plansFig}__plans-container company`,
    kids: [
      featuresDesc,
      plansList
    ]
  })
  const { protocol, main_domain } = bootstrap()
  const contactLink = `${protocol}://${main_domain}/contact/?lang=en&info=true&type=drumee&section=drumee&area=pro`;
  const btnWrapper = Skeletons.Box.X({
    className: `${plansFig}__btn-wrapper company`,
    kids: [
      Skeletons.Note({
        className: `${plansFig}__btn-confirm company`,
        content: LOCALE.CONTACT_US,
        target: '_blank',
        href: contactLink,
        type: 'company'
      })
    ]
  })

  const a = Skeletons.Box.Y({
    className: `${plansFig}__main`,
    debug: __filename,
    kids: [
      header,
      plansContainer,
      btnWrapper
    ]
  });

  return a;
};

export default __account_subscription_plan_company;

// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /ui/src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/email-item.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_contact_detail_email_item = item => {
  const contactFig  =  'widget-contact-detail';

  const emailContent = Skeletons.Note({
    className         : `${contactFig}__note details email selectable-text-all`,
    content           : item.email,
    escapeContextmenu : true
  });

  if (item.email.length > 22) {
    emailContent.tooltips =
      {content : item.email};
  }

  const emailItemsOpt = Skeletons.Box.X({
    className   : `${contactFig}__item`,
    debug       : __filename,
    kids        : [
      emailContent,
      Skeletons.Note({
        className   : `${contactFig}__note category label`,
        content     : item.category
      })
    ]});
  return emailItemsOpt;
};


module.exports = __skl_contact_detail_email_item;
/* ================================================================== *
 * Copyright Xialia.com  2011-2022
 * FILE : /src/drumee/builtins/window/adminpanel/widget/member_detail/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_member_detail  (_ui_) {
  const detailFig = _ui_.fig.family

  const data = _ui_._memberData || _ui_.mget('memberData')

  const defaultText = LOCALE.NOT_INDICATED

  let memberStatus, option;

  if ((data.status == _a.locked) || (data.status == _a.archived)) {
    memberStatus = require('./member-status').default(_ui_, data)
  }

  let verified = Skeletons.Button.Svg({
    ico         : 'available',//'backoffice_checkboxfill',
    className   : `${detailFig}__icon verified-status backoffice_checkboxfill`
  })

  let notVerified = Skeletons.Button.Svg({
    ico         : 'info',
    className   : `${detailFig}__icon not-verified-status info`,
    tooltips    : {
      content   : LOCALE.NOT_YET_VERIFIED,
      className : `${detailFig}__tooltips not-verified-status info`
    }
  })

  const name = Skeletons.Box.X({
    className   : `${detailFig}__wrapper name`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'profile-signup',
        className   : `${detailFig}__icon name profile-signup`
      }),
      
      Skeletons.Box.Y({
        className   : `${detailFig}__items name`,
        kids  : [
          Skeletons.Note({
            className   : `${detailFig}__note firstname`,
            content     : data.firstname || defaultText
          }),

          Skeletons.Note({
            className   : `${detailFig}__note familyname`,
            content     : data.lastname || defaultText
          })
        ]
      })
    ]
  })

  let emailStatus = notVerified
  if (data.email_verified == _a.yes) {
    emailStatus = verified
  }

  let emailContent = Skeletons.Note({
    className         : `${detailFig}__note details email selectable-text-all`,
    content           : data.email,
    escapeContextmenu : true,
  })

  if(data.email.length > 23) {
    emailContent.tooltips = {
      content : data.email
    }
  }

  const email = Skeletons.Box.X({
    className   : `${detailFig}__wrapper email`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'email',
        className   : `${detailFig}__icon email`
      }),
      
      Skeletons.Box.Y({
        className   : `${detailFig}__items email`,
        kids        : [
          emailContent
          // Skeletons.Note({
          //   content: data.email
          // })
        ]
      }),

      emailStatus
    ]
  })

  const ident = Skeletons.Box.X({
    className   : `${detailFig}__wrapper ident`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_id',
        className   : `${detailFig}__icon ident`
      }),
      
      Skeletons.Box.Y({
        className   : `${detailFig}__items ident`,
        kids        : [
          Skeletons.Note({
            content: data.ident
          })
        ]
      })
    ]
  })

  let mobileStatus = notVerified
  if (data.mobile_verified == _a.yes) {
    mobileStatus = verified
  }
  const mobile = Skeletons.Box.X({
    className   : `${detailFig}__wrapper mobile`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_phone',
        className   : `${detailFig}__icon mobile account_phone`
      }),
      
      Skeletons.Box.Y({
        className   : `${detailFig}__items mobile`,
        kids        : [
          Skeletons.Note({
            content: data.areacode.concat(data.mobile) || defaultText
          })
        ]
      }),
      // mobileStatus
    ]
  })

  const address = Skeletons.Box.X({
    className   : `${detailFig}__wrapper address`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'ab_address',
        className   : `${detailFig}__icon address ab_address`
      }),
      
      Skeletons.Box.Y({
        className   : `${detailFig}__items address`,
        kids        : [
          Skeletons.Note({
            className   : `${detailFig}__note address details street`,
            content     : data.address.street || defaultText
          }),
        
          Skeletons.Note({
            className   : `${detailFig}__note details address city`,
            content     : data.address.city || defaultText
          }),
          
          Skeletons.Note({
            className   : `${detailFig}__note details address country`,
            content     : data.address.country || defaultText
          })
        ]
      })
    ]
  })

  // const comment = Skeletons.Box.X({
  //   className   : `${detailFig}__wrapper comment`,
  //   kids        : [
  //     Skeletons.Note({
  //       className   : `${detailFig}__note comment details`,
  //       content     : data.comment || ''
  //     })
  //   ]
  // })

  // member action option
  if (Visitor.id != data.drumate_id) {
    if (data.status == _a.active) {
      if ((data.email_verified == _a.no) || (data.mobile_verified == _a.no && data.otp == _a.sms)) {
        let _notVerifiedContent;
        if(data.email_verified == _a.no){
          _notVerifiedContent = LOCALE.EMAIL_IS_NOT_YET_VALIDATED //'Email is not yet validated'
        }
        let deleteInvMember = ''
        if (data.connected == '0'){
          deleteInvMember =  Skeletons.Note({
            className : `${detailFig}__button-action button-delete button clickable`,
            content   : LOCALE.DELETE_INVITE,
            service   : 'delete-inactive-member',
            uiHandler : _ui_
          })
        }
        option = Skeletons.Box.Y({
          className : `${detailFig}__wrapper options`,
          kids      : [
            Skeletons.Note({
              className : `${_ui_.fig.family}__note option`,
              content   : _notVerifiedContent
            }),
            Skeletons.Box.X({
              className  : `${_ui_.fig.family}__buttons-wrapper-resend`,
              kids: [
                deleteInvMember,
                Skeletons.Note({
                  className : `${detailFig}__button-action button-resend button clickable`,
                  content   : LOCALE.RESEND_INVITE,
                  service   : 'reset-member-password',
                  uiHandler : _ui_
                })
              ]
            })
            
          ]
        })
      }
    }

    if (data.status == _a.archived) {
      // @ts-ignore
      let statusDate = Dayjs.unix(data.status_date);
      let deleteDate = Dayjs.unix(data.status_date).add(15, 'days').format('DD/MM/YY'); //do not change data.status_date to statusDate
      // @ts-ignore
      let now = Dayjs();
      let dateDiff = now.diff(statusDate, 'days') + 1;

      if (dateDiff > 15) {
        option = Skeletons.Note({
          className : `${detailFig}__button-action button-delete button clickable`,
          content   : LOCALE.DELETE_MEMBER,
          service   : 'delete-member',
          uiHandler : _ui_,
        })
      } else {
        option = Skeletons.Note({
          className : `${detailFig}__note delete-action clickable`,
          content   : (deleteDate.printf(LOCALE.SECURITY_REASONS_DATE_OF_DELETION))
          // 
        })
      }
    }
  }

  const memberAction = Skeletons.Box.X({
    className   : `${detailFig}__wrapper member-action`,
    kids        : [ option ]
  })
  
  let a = Skeletons.Box.Y({
    className  : `${detailFig}__main`,
    debug      : __filename,
    kids       : [
      memberStatus,
      Skeletons.Box.Y({
        className  : `${detailFig}__container`,
        kids : [
          name,
          email,
          ident,
          mobile,
          address,
          // comment,
          memberAction
        ]
      })
    ]
  })

  return a;
}

export default __skl_member_detail

// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/invoices.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {Object} _ui_
 * @param {Object} item
*/
function addRow(_ui_, item) {
  const connectionLogFig = `${_ui_.fig.family}-invoices`;
  const tableFig = `${connectionLogFig}-table`;

  let status =  Skeletons.Note({
    className : `${tableFig}__item data-cell status ${item.status}`,
    content   : item.status
  })

  let pdfState = _a.open;

  if (status == _a.open) {
    pdfState = _a.closed;

    status =  Skeletons.Note({
      className : `${tableFig}__item data-cell status ${item.status} text-underline`,
      href      : item.url,
      target    : '_blank',
      content   : LOCALE.RETRY_PAYMENT
    })
  }

  return Skeletons.Box.X({
    className: `${tableFig}__item-wrapper row`,
    kids: [
      Skeletons.Note({
        className : `${tableFig}__item data-cell date`,
        content   : Dayjs.unix(item.paidtime).locale(Visitor.language()).format("DD/MM/YYYY")
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell invoice-number`,
        content   : item.invoice_id
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell plan`,
        content   : `Drumee ${item.plan}`
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell period`,
        content   : `${item.period}ly`
      }),

      status,

      Skeletons.Button.Svg({
        ico       : 'raw-documents_pdf',
        className : `${tableFig}__item data-cell icon pdf`,
        href      : item.pdf,
        target    : '_blank',
        dataset   : {
          mode  : pdfState
        }
      })
    ]
  });
}


const __account_subscription_invoices = function(_ui_) {
  const invoicesFig = `${_ui_.fig.family}-invoices`;

  const closeIcon = Skeletons.Box.X({
    className   : `${invoicesFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${invoicesFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]
  });

  const header = Skeletons.Box.X({
    className : `${invoicesFig}__header`,
    kids      : [
      Skeletons.Note({
        className : `${invoicesFig}__note header`,
        content   : LOCALE.INVOICES
      }),

      closeIcon
    ]
  })

  const tableFig = `${invoicesFig}-table`;

  const tableHeader = Skeletons.Box.X({
    className  : `${tableFig}__item-wrapper row header`,
    kids: [
      Skeletons.Note({
        className : `${tableFig}__item data-cell header date`,
        content   : LOCALE.DATE
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header invoice-number`,
        content   : LOCALE.INVOICE_NUMBER
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header plan`,
        content   : LOCALE.PLAN
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header period`,
        content   : LOCALE.PERIOD
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header status`,
        content   : LOCALE.STATUS
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header pdf`,
        content   : LOCALE.DOWNLOAD
      }),
    ]
  })

  let addItemOpt = (ins, item) => addRow(_ui_,item)

  const noContent = Skeletons.Box.X({
    className  : `${tableFig}__item-wrapper row default-content`,
    kids: [
      Skeletons.Note({
        className : `${tableFig}__item default-content`,
        content   : LOCALE.NO_INVOICE_TO_SHOW
      })
    ]
  })

  const table = Skeletons.Box.Y({
    className  : tableFig,
    kids: [
      tableHeader,
      Skeletons.List.Smart({
        className   : `${tableFig}__item-list`,
        placeholder : noContent,
        spinner     : true,
        timer       : 50,
        sys_pn      : 'list-invoices',
        itemsOpt    : addItemOpt,
        api         : {
          service : SERVICE.subscription.invoice,
          hub_id  : Visitor.id
        },
      })
    ]
  })
  
  const content = Skeletons.Box.Y({
    className : `${invoicesFig}__content`,
    sys_pn    : 'invoices-content',
    kids      : [
      table
    ]
  })


  const a = Skeletons.Box.Y({
    className : `${invoicesFig}__main`,
    debug     : __filename,
    kids      : [
      header,
      content
    ]
  });

  return a; 
};

export default __account_subscription_invoices;
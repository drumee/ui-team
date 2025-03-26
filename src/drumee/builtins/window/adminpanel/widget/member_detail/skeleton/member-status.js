function __skl_member_detail_member_status  (_ui_, data) {
  const detailFig = _ui_.fig.family

  let statusContentText, actionIcon;

  const statusChangedTime = Skeletons.Note({
    className  : `${detailFig}__note member-status timestamp`,
    content    : Dayjs.unix(data.status_date).format("DD/MM/YYYY HH [h] mm")
  })
  
  statusContentText = LOCALE.ACCOUNT_BLOCKED //'Account blocked'
  if (data.status == _a.archived) {
    statusContentText = LOCALE.ACCOUNT_ARCHIVED //'Account archived'
  }

  const statusContent = Skeletons.Box.X({
    className  : `${detailFig}__status-content`,
    kids: [
      Skeletons.Note({
        className  : `${detailFig}__note member-status`,
        content    : statusContentText
      }),
    ]
  })

  const options = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__status-action`,
    kids: [
      actionIcon
    ]
  })

  const a = Skeletons.Box.X({
    className  : `${detailFig}__status member-status`,
    kids: [
      statusChangedTime,
      statusContent,
      options
    ]
  })

  return a

}

export default __skl_member_detail_member_status
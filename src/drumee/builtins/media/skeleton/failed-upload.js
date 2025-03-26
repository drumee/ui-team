const failedUpload = function (_ui_, list) {
  const pfx = `${_ui_.fig.group}__failed-upload`;
  let kids = list.map((content) => {
    return Skeletons.Note({
      className: `${pfx}-item`,
      content
    })
  })
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}-main`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-title`,
        content: LOCALE.UPLOAD_FAILED
      }),
      Skeletons.List.Smart({
        className: `${pfx}-container`,
        sys_pn: "failed-upload",
        kids
      })
    ]
  })
};
module.exports = failedUpload;

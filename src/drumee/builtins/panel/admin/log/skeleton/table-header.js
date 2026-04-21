module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__table-header`,
    kids: [
      Skeletons.Note({ className: `${pfx}__col user`,     content: LOCALE.USER            }),
      Skeletons.Note({ className: `${pfx}__col action`,   content: LOCALE.ACTION          }),
      Skeletons.Note({ className: `${pfx}__col resource`, content: LOCALE.TARGET_RESOURCE }),
      Skeletons.Note({ className: `${pfx}__col timestamp`,content: LOCALE.TIMESTAMP       }),
    ],
  });
};

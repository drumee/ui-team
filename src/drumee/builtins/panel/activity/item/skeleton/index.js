module.exports = function (ui) {
  const pfx = ui.fig.family;
  const filename = ui.mget(_a.filename) || "";
  const ext = ui.mget(_a.ext) ? `.${ui.mget(_a.ext)}` : "";
  const filetype = ui.mget(_a.filetype) || "";
  const modifier = ui.mget(_a.modifier) || "me";
  const mtime = ui.mget(_a.mtime);

  const deletionDate = Dayjs.unix(mtime).format(Visitor.timeformat());

  const daysLeft = mtime
    ? Math.max(0, 30 - Math.ceil((Date.now() / 1000 - mtime) / 86400))
    : 30;

  const timeHelper = (input) => {
    const [datePart, timePart] = input.split(" - ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    const past = new Date(year, month - 1, day, hour, minute, second);
    const now = new Date();

    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return "now";

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
    }

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
    }

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) {
      return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
    }

    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) {
      return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
    }

    const diffYear = Math.floor(diffMonth / 12);
    return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
  };

  const timeAgo = timeHelper(mtime);

  return Skeletons.Box.X({
    className: `${pfx}__row`,
    kids: [
      Skeletons.Element({
        content: require("./template")(ui),
        className: `${pfx}__file-icon ${filetype}`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__info`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__name`,
            content: `${filename}${ext}`,
          }),
          Skeletons.Box.X({
            className: `${pfx}__meta`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__date`,
                content: `${timeAgo}`,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

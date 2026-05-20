export default function export_data_progress(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__progress-wrapper`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__progress-bar`,
        sys_pn: "progress",
      }),
      Skeletons.Note({
        className: `${pfx}__progress-message`,
        content:
          LOCALE.EXPORT_BACKUP_PREPARING ||
          "Your backup is being prepared. This may take a long time. You will receive an email with a download link when it is ready.",
      }),
    ],
  });
}

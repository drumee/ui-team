export default function delete_account_progress(ui) {
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
          LOCALE.DELETE_ACCOUNT_BACKUP_PREPARING ||
          "Your backup is being prepared. This may take a long time. You can jump into the next step and receive later a link by email to download your backup.",
      }),
    ],
  });
}

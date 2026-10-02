// The meeting's attachments on the guest (meeting-link) page. Names come from
// dmz.meeting_files; the bytes from file/orig, which the organizer's
// room.public_link / room.link_files opened to the link.
function fileUrl(nid, hub_id, b = {}) {
  let url = `${b.endpoint || ""}file/orig/${nid}/${hub_id}`;
  if (b.keysel) url += `?keysel=${b.keysel}`;
  return url;
}

module.exports = function (ui, items, hub_id) {
  if (!items || !items.length) return null;
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__attachments`,
    kids: [
      Skeletons.Note({ className: `${pfx}__attachments-title`, content: LOCALE.ATTACHMENTS }),
      ...items.map((f) =>
        Skeletons.Box.X({
          className: `${pfx}__attachment`,
          service: "dmz-open-attachment",
          uiHandler: [ui],
          fileNid: f.nid,
          fileHub: hub_id,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__attachment-ico` }),
            Skeletons.Note({
              className: `${pfx}__attachment-name`,
              content: f.ext ? `${f.filename}.${f.ext}` : f.filename,
            }),
          ],
        }),
      ),
    ],
  });
};

module.exports.fileUrl = fileUrl;

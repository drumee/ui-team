/**
 * What a Chat details panel talks to, per conversation kind.
 *
 *   workspace — a workspace (hub) team chat: channel.details /
 *               channel.media_list on the hub; file threads, workspace mute,
 *               meeting and export all apply. Gated on the chat capability
 *               (the download bit), as the folder window's chat is.
 *   direct    — a 1:1 conversation: chat.p2p_details / chat.p2p_media_list
 *               for the peer, on the viewer's own hub (Visitor.id — what
 *               widget_chat sends for a private room). No file threads;
 *               Mute is per PERSON (activity.mute_peer_set) and Download is
 *               the DM export (chat.p2p_export); the members section lists
 *               the two participants. Always open to the participant.
 *
 * `mute` — { isMuted(w), set(w, muted) → {ok} }: what the Mute tile acts on.
 */
const Mute = require("../../panel/activity/mute");
function svc(mod, name) {
  return (
    (typeof SERVICE !== "undefined" && SERVICE[mod] && SERVICE[mod][name]) ||
    `${mod}.${name}`
  );
}

const hubOf = (w) => w.mget(_a.actual_hub_id) || w.mget(_a.hub_id);
const viewerHub = () => (typeof Visitor !== "undefined" && Visitor.id) || "";

const MODES = {
  workspace: {
    sections: { threads: 1, mute: 1, download: 1, meeting: 1 },
    participants: 0,
    gate: (priv) => !!(Number(priv) & _K.permission.download),
    hub: hubOf,
    mute: {
      isMuted: (w) => Mute.isPopupMuted({ hub_id: hubOf(w) }),
      set: (w, muted) => Mute.setMute(w, hubOf(w), muted),
    },
    details: (w) => ({ service: svc("channel", "details"), hub_id: hubOf(w) }),
    mediaList: (w, kind, page) => ({
      service: svc("channel", "media_list"),
      hub_id: hubOf(w),
      kind,
      page,
    }),
  },
  direct: {
    sections: { threads: 0, mute: 1, download: 1, meeting: 1 },
    participants: 1,
    gate: () => true,
    hub: () => viewerHub(),
    // Per person: activity.mute_peer_set (panel/activity/mute).
    mute: {
      isMuted: (w) => Mute.isPeerMuted(w.mget("peer_id")),
      set: (w, muted) => Mute.setPeerMute(w, w.mget("peer_id"), muted),
    },
    details: (w) => ({
      service: svc("chat", "p2p_details"),
      peer_id: w.mget("peer_id"),
      hub_id: viewerHub(),
    }),
    mediaList: (w, kind, page) => ({
      service: svc("chat", "p2p_media_list"),
      peer_id: w.mget("peer_id"),
      hub_id: viewerHub(),
      kind,
      page,
    }),
  },
};

function modeOf(w) {
  return MODES[w && w.cdMode] || MODES.workspace;
}

module.exports = { MODES, modeOf };

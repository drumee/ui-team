// ==================================================================== *
//   FILE : builtins/editor/docs/collab
//   TYPE : Helpers — Casual Docs real-time co-editing on top of Drumee storage
// ==================================================================== *

/**
 * Casual Docs co-editing = a Hocuspocus/y-websocket "gateway" (the
 * `casualoffice/docs` container) that relays CRDT frames between the peers
 * of a room, plus a REST side (`/api/rooms/:id/seed`) the FIRST peer uses to
 * seed the room with the starting .docx. The gateway holds NO durable truth
 * for us: Drumee does. The `<CasualEditor>` wrapper drives everything through
 * a `FileSource` adapter — this module is that adapter, pointed at Drumee's
 * media services, so:
 *
 *   room id  = the Drumee node id (nid)     → every opener lands in one room
 *   open()   = GET  /file/orig/<nid>/<hub>  → seed bytes
 *   save()   = media.save (autosave/Ctrl+S) → the .udoc on disk stays current
 *   rename() = media.rename, delete() = media.trash
 *
 * The gateway is reached through the endpoint's own nginx route
 * (`/-/<ep>/collab/` → 127.0.0.1:8085), so WS and REST share the session
 * origin. When the gateway is down `gatewayUp()` says so and the editor falls
 * back to the single-user DocxEditor path.
 */


const COLLAB_PATH = "collab";

// A guaranteed-valid minimal blank .docx (OOXML: [Content_Types], _rels, an
// empty word/document.xml). New documents are CREATED on Drumee with these
// bytes first so they have a nid — and therefore a collab room — before the
// editor mounts.
const BLANK_DOCX_B64 =
  "UEsDBBQAAAAIACGULl0XmADX6wAAALIBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU4DMQy98xWRr2gmAweEUKc9sByBQ/kAK/HMRM2mOC3t3+NpoQdUONpvs99itQ9e7aiwS7GHm7YDRdEk6+LYw8f6pbkHxRWjRZ8i9XAghtXyarE+ZGIl4sg9TLXmB63ZTBSQ25QpCjKkErDKWEad0WxwJH3bdXfapFgp1qbOHiBmTzTg1lf1vJf96ZJCnkE9nphzWA+Ys3cGq+B6F+2vmOY7ohXlkcOTy3wtBNCXI2bo74Qf4ZuUU5wl9Y6lvmIQmv5MxWqbzDaItP3f58KlaRicobN+dsslGWKW1oNvz0hAF88f6GPlyy9QSwMEFAAAAAgAIZQuXT+t/vqvAAAALAEAAAsAAABfcmVscy8ucmVsc43POw7CMAwA0J1TRN5pWgaEUEMXhNQVlQNEiZtWNB/F4dPbk4EBKgZG/57tunnaid0x0uidgKoogaFTXo/OCLh0p/UOGCXptJy8QwEzEjSHVX3GSaY8Q8MYiGXEkYAhpbDnnNSAVlLhA7pc6X20MuUwGh6kukqDfFOWWx4/DVigrNUCYqsrYN0c8B/c9/2o8OjVzaJLP3YsOrIso8Ek4OGj5vqdLjILPJ/Dv548vABQSwMEFAAAAAgAIZQuXRPKAbPbAAAAXAEAABEAAAB3b3JkL2RvY3VtZW50LnhtbE2QwW7DIBBE7/0KxL3BsdI2skJy6y1SpbYfQMwaLBkWwSY0/fpSXNU+MW9ntTPicPpyE7tBTCN6ybebhjPwPerRG8k/P14f95wlUl6rCT1IfofET8eHQ+409lcHnli54FOXJbdEoRMi9RacShsM4Is3YHSKCkYjMkYdIvaQUglwk2ib5lk4NXpeb15Q36sIoj4JenqL88S8f7P8G7Nt212pmTtb9NO+aPG3cVaxjAlDMXbzThyNpQUvSIRu4QmGlWtBaYiSv7QVB0RaoblSxTlPrNqJ/+Zi+ZfjD1BLAQIUAxQAAAAIACGULl0XmADX6wAAALIBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAIZQuXT+t/vqvAAAALAEAAAsAAAAAAAAAAAAAAIABHAEAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAIZQuXRPKAbPbAAAAXAEAABEAAAAAAAAAAAAAAIAB9AEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAAP4CAAAAAA==";

/** ArrayBuffer ↔ base64 — the .docx is stored base64-in-JSON so it rides the
 *  same text `content` path of media.save the sheet editor uses. */
function abToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function base64ToAb(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

const { contentUrl } = require("builtins/editor/content-url");

/** The three bases: the endpoint's http origin+path, the gateway REST base
 *  and the gateway WebSocket base (Hocuspocus lives at /yjs). */
function bases() {
  const http = location.href.split("#")[0].replace(/\/+$/, "");
  const rest = `${http}/${COLLAB_PATH}`;
  const ws = `${rest.replace(/^http/, "ws")}/yjs`;
  return { http, rest, ws };
}

/** Is the collab gateway reachable? Cheap liveness probe; on any failure the
 *  caller mounts the single-user editor instead. */
async function gatewayUp() {
  try {
    const r = await fetch(`${bases().rest}/health`, { cache: "no-store" });
    if (!r.ok) return false;
    // Without the nginx route, /-/<ep>/collab/health falls through to the
    // Drumee page server's SPA catch-all (HTTP 200, HTML) — `r.ok` alone is a
    // false positive. The gateway answers `{"ok":true,"rooms":n}`.
    const j = await r.json().catch(() => null);
    return !!(j && j.ok === true);
  } catch (e) {
    return false;
  }
}

/** A stable, pleasant colour per user (peers are told apart by it). */
function colorFor(seed) {
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 45%)`;
}

/** Who this peer is, for cursors / comments / presence. */
function userIdentity() {
  const v = typeof Visitor !== "undefined" && Visitor.get ? Visitor : null;
  const first = v ? v.get("firstname") : "";
  const last = v ? v.get("lastname") : "";
  const name =
    [first, last].filter(Boolean).join(" ") ||
    (v && (v.get("ident") || v.get("email"))) ||
    "User";
  return { name, color: colorFor(v ? v.id : name) };
}

/**
 * FileSource adapter over Drumee media services.
 *
 * @param {View} editor   the editor_docs window (postService, mset, status)
 * @param {Object} ctx    { hub_id, pid, filename() }
 */
function makeFileSource(editor, ctx) {
  const ext = "udoc";
  const status = (s) => {
    if (editor && editor.setSaveStatus) editor.setSaveStatus(s);
  };
  const post = (opt) => editor.postService(opt, { async: 1 });

  return {
    kind: "personal",
    label: "Drumee",

    async list() {
      // The in-app File → Open is Drumee's own grid; nothing to list here.
      return [];
    },

    async open(id) {
      // ui-core's address for the node (share key for dmz visitors, cache
      // buster) — builtins/editor/content-url.
      const url = contentUrl(editor && editor.media, { nid: id, hub_id: ctx.hub_id });
      if (!url) throw new Error("no content url for the document");
      // Revalidate (ETag) instead of trusting the year-long Cache-Control
      // nginx puts on /file/orig/…: a plain GET returned the blank document
      // the file was created as, for as long as the browser cache lived.
      const res = await fetch(url, { credentials: "include", cache: "no-cache" });
      if (!res.ok) throw new Error(`content fetch failed: ${res.status}`);
      const content = await res.text();
      let bytes = null;
      try {
        const j = JSON.parse(content);
        if (j && j.docx) bytes = base64ToAb(j.docx);
      } catch (e) {
        /** not our JSON wrapper */
      }
      if (!bytes) bytes = base64ToAb(BLANK_DOCX_B64);
      return { bytes, name: ctx.filename(), etag: String(Date.now()) };
    },

    /**
     * media.save. A create (no id) writes an EMPTY node and only a
     * replace-save persists inline content, so a create is followed by one
     * replace with the same bytes (same double-save the sheet editor does).
     */
    async save(id, bytes, opts = {}) {
      // Circuit breaker. Casual autosaves every few seconds for as long as the
      // document is dirty, and a save that can never succeed (the node was
      // trashed under the open window, the visitor lost write access) turned
      // into a request every 1.5 s, forever — the server logged hundreds of
      // failed media.save calls from one abandoned tab. After three failures
      // in a row the editor stops sending and stays "unsaved" until it is
      // reopened.
      if (editor && editor._saveDisabled) {
        status("unsaved");
        throw new Error("saving disabled after repeated failures");
      }
      status("saving");
      const content = JSON.stringify({ docx: abToBase64(bytes) });
      const name = opts.name || ctx.filename();
      const base = {
        service: SERVICE.media.save,
        hub_id: ctx.hub_id,
        pid: ctx.pid,
        filename: `${name}.${ext}`,
        content,
        metadata: { dataType: "doc.casual" },
      };
      try {
        let nid = id;
        let where = { hub_id: ctx.hub_id, pid: ctx.pid };
        if (!nid) {
          const created = await post({ ...base, replace: 0, p: ctx.pid });
          if (!created || !created.nid) throw new Error("media.save returned no node");
          nid = created.nid;
          // Address the replace exactly where the server put the node.
          where = { hub_id: created.hub_id || ctx.hub_id, pid: created.pid || ctx.pid };
          // The server de-duplicates names ("Untitled document(9)"); the
          // replace must carry THAT name or mfs_set_node_attr tries to rename
          // the node back and dies on the unique path (ER_DUP_ENTRY → 500).
          const createdName = created.filename || created.user_filename;
          if (createdName) base.filename = `${String(createdName).replace(/\.(udoc|docx)$/i, "")}.${ext}`;
          if (editor && editor.mset) editor.mset(created);
          // Let the new node settle before the first replace (an immediate one
          // reliably 400s); the retry loop below is the safety net.
          await new Promise((r) => setTimeout(r, 600));
        }
        // A replace fired straight after the create can bounce (400
        // SERVICE_FAILED) before the new node settles server-side; retry with
        // a short backoff rather than leaving a 0-byte file behind. Only that
        // first replace gets retries: a later one failing is not a race, and
        // hammering it is what the breaker above exists to stop.
        const attempts = id ? 1 : 4;
        let data = null;
        let lastErr = null;
        for (let i = 0; i < attempts; i++) {
          try {
            data = await post({ ...base, ...where, nid, id: nid, replace: 1 });
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            if (i + 1 < attempts) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
          }
        }
        if (lastErr) throw lastErr;
        if (editor && editor.mset && data) editor.mset(data);
        if (editor) {
          editor._changed = 0;
          editor._saveFailures = 0;
        }
        status("saved");
        return { id: nid, etag: String(Date.now()) };
      } catch (e) {
        if (editor) {
          editor._saveFailures = (editor._saveFailures || 0) + 1;
          if (editor._saveFailures >= 3) editor._saveDisabled = 1;
        }
        status("unsaved");
        throw e;
      }
    },

    async rename(id, newName) {
      // Casual normalises names to ".docx"; Drumee keeps the .udoc ext apart.
      const filename = String(newName || "").trim().replace(/\.(udoc|docx)$/i, "");
      await post({
        service: SERVICE.media.rename,
        nid: id,
        hub_id: ctx.hub_id,
        filename,
      });
      if (editor) {
        if (editor.update_name) editor.update_name(_a.filename, filename);
        if (editor.mset) editor.mset({ filename });
      }
    },

    async delete(id) {
      await post({
        service: SERVICE.media.trash,
        nid: [{ nid: id, hub_id: ctx.hub_id }],
        hub_id: ctx.hub_id,
      });
    },

    watchRecent() {
      return () => {};
    },
  };
}

module.exports = {
  BLANK_DOCX_B64,
  abToBase64,
  base64ToAb,
  bases,
  gatewayUp,
  userIdentity,
  makeFileSource,
};

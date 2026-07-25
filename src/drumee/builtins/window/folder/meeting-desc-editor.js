// Rich "description / agenda" editor for the Schedule-a-meeting modal — a
// contenteditable with @-mention people, "/" file mention, and inline image
// paste + drag-drop. Ported (single-scope) from the task-description editor
// (window/tasks/index.js) and the chat "/" file picker (widget/chat/index.js),
// then mixed onto __window_folder via Object.assign. Method names are _mm*-
// prefixed to avoid colliding with the mfsInteract base.
//
// Content serializes to one marker string stored in metadata.content.message
// (see meeting-markers.js). Globals (Skeletons, document, window, bootstrap,
// SERVICE, _a) are injected — no imports beyond the marker grammar.
const { contentTokenRe, imgMarker } = require("./meeting-markers");

module.exports = {
  _mmHubId() {
    return this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
  },
  _mmDestNid() {
    return this.mget(_a.actual_home_id) || this.mget(_a.nid);
  },
  _mmDescEditorEl() {
    const root = this.dialogWrapper && this.dialogWrapper.el;
    return root && root.querySelector(`.${this.fig.family}__meeting-modal-desc-editor`);
  },

  // ── chip / image node builders ──────────────────────────────────────────
  _mmMakeMentionChip(uid, name) {
    const chip = document.createElement("span");
    chip.className = `${this.fig.family}__meeting-modal-mention-chip`;
    chip.setAttribute("contenteditable", "false");
    chip.dataset.uid = String(uid);
    chip.dataset.name = name;
    chip.textContent = `@${name}`;
    return chip;
  },
  _mmMakeFileChip(nid, hub, filename) {
    const chip = document.createElement("span");
    chip.className = `${this.fig.family}__meeting-modal-file-chip`;
    chip.setAttribute("contenteditable", "false");
    chip.dataset.nid = String(nid);
    if (hub) chip.dataset.hub = String(hub);
    chip.dataset.name = filename;
    chip.textContent = `@${filename}`;
    return chip;
  },
  _mmImageUrlForNid(nid, hub) {
    const h = hub || this._mmHubId();
    const b = (typeof bootstrap === "function" && bootstrap()) || {};
    let url = `${b.endpoint || ""}file/orig/${nid}/${h}`;
    if (b.keysel) url += `?keysel=${b.keysel}`;
    return url;
  },
  _mmMakeInlineImage(nid, hub, width, editable) {
    const img = document.createElement("img");
    img.src = this._mmImageUrlForNid(nid, hub);
    img.setAttribute("draggable", "false");
    img.alt = "";
    if (!editable) {
      img.className = `${this.fig.family}__meeting-modal-inline-img-static`;
      if (width) img.style.width = `${width}px`;
      return img;
    }
    const wrap = document.createElement("span");
    wrap.className = `${this.fig.family}__meeting-modal-inline-img`;
    wrap.setAttribute("contenteditable", "false");
    wrap.dataset.nid = String(nid);
    if (hub) wrap.dataset.hub = String(hub);
    if (width) wrap.style.width = `${width}px`;
    wrap.appendChild(img);
    return wrap;
  },

  // ── marker text ↔ editor DOM ──────────────────────────────────────────────
  _mmRenderEditorContent(editorEl, markerText) {
    editorEl.textContent = "";
    const text = String(markerText || "");
    const editable = editorEl.getAttribute("contenteditable") === "true";
    const appendText = (str) => {
      str.split("\n").forEach((part, i) => {
        if (i > 0) editorEl.appendChild(document.createElement("br"));
        if (part) editorEl.appendChild(document.createTextNode(part));
      });
    };
    const re = contentTokenRe();
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) appendText(text.slice(last, m.index));
      if (m[2] != null) {
        editorEl.appendChild(this._mmMakeMentionChip(m[2], m[1]));
      } else if (m[3] != null) {
        editorEl.appendChild(this._mmMakeInlineImage(m[3], m[4], m[5], editable));
      } else if (m[8] != null) {
        editorEl.appendChild(this._mmMakeFileChip(m[8], m[7], m[6]));
      }
      last = re.lastIndex;
    }
    if (last < text.length) appendText(text.slice(last));
  },
  _mmSerializeEditor(editorEl) {
    if (!editorEl) return "";
    const fig = this.fig.family;
    const chipClass = `${fig}__meeting-modal-mention-chip`;
    const fileClass = `${fig}__meeting-modal-file-chip`;
    const imgClass = `${fig}__meeting-modal-inline-img`;
    let out = "";
    const walk = (node) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          out += n.textContent;
        } else if (n.nodeType === 1) {
          if (n.classList && n.classList.contains(chipClass)) {
            out += `[@${n.dataset.name || n.textContent.replace(/^@/, "")}](user:${n.dataset.uid})`;
          } else if (n.classList && n.classList.contains(fileClass)) {
            out += `[@${n.dataset.name || n.textContent.replace(/^@/, "")}](mention:${n.dataset.hub || ""}:${n.dataset.nid})`;
          } else if (n.classList && n.classList.contains(imgClass)) {
            const w = parseInt(n.style.width, 10) || 0;
            out += imgMarker(n.dataset.nid, n.dataset.hub, w || undefined);
          } else if (n.tagName === "BR") {
            out += "\n";
          } else if (n.tagName === "DIV") {
            if (out && !out.endsWith("\n")) out += "\n";
            walk(n);
          } else {
            walk(n);
          }
        }
      });
    };
    walk(editorEl);
    return out;
  },
  _mmCollectMentionUids(editorEl) {
    const uids = [];
    if (!editorEl) return uids;
    editorEl
      .querySelectorAll(`.${this.fig.family}__meeting-modal-mention-chip`)
      .forEach((c) => {
        const u = String(c.dataset.uid || "");
        if (u && !uids.includes(u)) uids.push(u);
      });
    return uids;
  },

  // ── lifecycle ─────────────────────────────────────────────────────────────
  _mmInitDescEditor(editorEl, initial) {
    if (!editorEl) return;
    if (this._mmSerializeEditor(editorEl) !== (initial || "")) {
      this._mmRenderEditorContent(editorEl, initial || "");
    }
    editorEl.oninput = () => this._mmOnDescInput(editorEl);
    editorEl.onkeydown = (e) => this._mmOnDescKeydown(e);
    editorEl.onblur = () => {
      this._mmMentionCloseTimer = setTimeout(() => this._mmCloseMention(), 150);
    };
    editorEl.onpaste = (e) => this._mmOnPaste(e, editorEl);
    editorEl.ondragover = (e) => {
      if (e.dataTransfer && /Files/.test((e.dataTransfer.types || []).join(","))) {
        e.preventDefault();
      }
    };
    editorEl.ondrop = (e) => this._mmOnDrop(e, editorEl);
  },

  _mmOnDescInput(editorEl) {
    const fig = this.fig.family;
    if (
      !editorEl.textContent.trim() &&
      !editorEl.querySelector(`.${fig}__meeting-modal-mention-chip`) &&
      !editorEl.querySelector(`.${fig}__meeting-modal-file-chip`) &&
      !editorEl.querySelector(`.${fig}__meeting-modal-inline-img`)
    ) {
      editorEl.innerHTML = "";
    }
    this._mmHandleMention(editorEl);
  },
  _mmOnDescKeydown(e) {
    const ref = this._mmMention;
    if (!ref) return;
    if (e.key === "Escape") {
      e.preventDefault();
      return this._mmCloseMention();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = ref.items.length;
      if (!n) return;
      ref.index = (ref.index + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      return this._mmHighlightMention(ref);
    }
    if (e.key === "Enter" && ref.items.length) {
      e.preventDefault();
      return this._mmInsertPick(ref.items[ref.index]);
    }
  },

  // ── @ people / "/" file detection ─────────────────────────────────────────
  _mmHandleMention(editorEl) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return this._mmCloseMention();
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (!range.collapsed || node.nodeType !== 3 || !editorEl.contains(node)) {
      return this._mmCloseMention();
    }
    const before = node.textContent.slice(0, range.startOffset);
    const at = before.match(/@([^\s@]*)$/);
    const slash = before.match(/\/([^\s/]*)$/);
    if (at) {
      const filter = at[1].toLowerCase();
      const members = (this._hubMembers || [])
        .filter((mm) => {
          if (!filter) return true;
          const name = [mm.firstname, mm.lastname].filter(Boolean).join(" ").toLowerCase();
          return name.includes(filter) || String(mm.email || "").toLowerCase().includes(filter);
        })
        .slice(0, 8)
        .map((mm) => ({
          kind: "user",
          uid: String(mm.id || mm.uid || ""),
          name: [mm.firstname, mm.lastname].filter(Boolean).join(" ").trim() || mm.email || (mm.id || mm.uid),
          member: mm,
        }));
      if (!members.length) return this._mmCloseMention();
      this._mmMention = { node, start: range.startOffset - at[0].length, end: range.startOffset, items: members, index: 0, dropdownEl: null };
      return this._mmOpenMention(members, editorEl);
    }
    if (slash) {
      // Async file search; guard the token is still current when it resolves.
      const token = slash[0];
      const start = range.startOffset - token.length;
      const end = range.startOffset;
      this._mmFetchMentionFiles(slash[1]).then((files) => {
        const cur = window.getSelection();
        if (!cur || !cur.rangeCount) return;
        if (!files.length) return this._mmCloseMention();
        const items = files.map((f) => ({
          kind: "file",
          nid: String(f.nid || f.id || ""),
          hub: String(f.hub_id || this._mmHubId() || ""),
          name: f.filename || f.user_filename || "file",
          file: f,
        }));
        this._mmMention = { node, start, end, items, index: 0, dropdownEl: null };
        this._mmOpenMention(items, editorEl);
      });
      return;
    }
    return this._mmCloseMention();
  },

  async _mmFetchMentionFiles(filter) {
    const query = (filter || "").trim().toLowerCase();
    const hubId = this._mmHubId();
    const rows = [];
    const seen = new Set();
    const visited = new Set();
    const queue = [{ nid: this._mmDestNid() }];
    const maxFolders = query ? 30 : 1;
    const maxRows = 60;
    const toRows = (d) => (Array.isArray(d) ? d : (d && (d.rows || d.data)) || []);
    while (queue.length && visited.size < maxFolders && rows.length < maxRows) {
      const folder = queue.shift();
      if (!folder || !folder.nid || visited.has(folder.nid)) continue;
      visited.add(folder.nid);
      const data = await this.fetchService({
        service: SERVICE.media.show_node_by,
        hub_id: hubId,
        nid: folder.nid,
      }).catch(() => null);
      for (const item of toRows(data)) {
        if (!item || item.filetype === _a.hub) continue;
        const isFolder = item.filetype === _a.folder || item.ftype === _a.folder;
        const filename = item.filename || item.user_filename || "";
        const key = String(item.nid || "");
        if (!isFolder && key && !seen.has(key)) {
          if (!query || filename.toLowerCase().includes(query)) {
            seen.add(key);
            rows.push(item);
            if (rows.length >= maxRows) break;
          }
        }
        if (query && isFolder && item.nid && queue.length < maxFolders) {
          queue.push({ nid: item.nid });
        }
      }
    }
    return rows;
  },

  _mmOpenMention(items, editorEl) {
    this.ensurePart("mm-mention")
      .then((part) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        const fig = this.fig.family;
        part.feed(
          items.map((it, i) =>
            Skeletons.Box.X({
              className: `${fig}__meeting-modal-mention-item`,
              attrOpt: { "data-idx": i, "data-active": i === 0 ? 1 : 0 },
              kids:
                it.kind === "file"
                  ? [
                      Skeletons.Image.Svg({ className: `${fig}__meeting-modal-mention-fico`, ico: "app-attachment" }),
                      Skeletons.Note({ className: `${fig}__meeting-modal-mention-name`, content: it.name }),
                    ]
                  : [
                      Skeletons.Avatar((it.member && it.member.avatar) || "default", `${fig}__meeting-modal-mention-ava`, it.name),
                      Skeletons.Note({ className: `${fig}__meeting-modal-mention-name`, content: it.name }),
                    ],
            }),
          ),
        );
        const root = part.el;
        if (!root || !this._mmMention) return;
        this._mmMention.dropdownEl = root;
        root.querySelectorAll(`.${fig}__meeting-modal-mention-item`).forEach((el, i) => {
          el.onmousedown = (ev) => ev.preventDefault();
          el.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this._mmInsertPick(items[i]);
          };
        });
        this._mmPositionMention(root, editorEl);
        root.dataset.open = "1";
      })
      .catch(() => {});
  },
  _mmPositionMention(el, editorEl) {
    const field = editorEl.parentNode;
    if (!field) return;
    const ref = this._mmMention;
    let caret = null;
    if (ref && ref.node && ref.node.isConnected) {
      try {
        const r = document.createRange();
        r.setStart(ref.node, Math.max(0, ref.start));
        r.setEnd(ref.node, Math.min(ref.end, ref.node.length));
        caret = r.getBoundingClientRect();
      } catch (_) {}
    }
    if (!caret || (!caret.width && !caret.height)) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) caret = sel.getRangeAt(0).getBoundingClientRect();
    }
    if (!caret || (!caret.width && !caret.height && !caret.left && !caret.top)) {
      caret = editorEl.getBoundingClientRect();
    }
    const fieldRect = field.getBoundingClientRect();
    const maxH = 220;
    el.style.left = `${Math.round(caret.left - fieldRect.left)}px`;
    if (window.innerHeight - caret.bottom < maxH) {
      el.style.top = "auto";
      el.style.bottom = `${Math.round(fieldRect.bottom - caret.top + 4)}px`;
    } else {
      el.style.bottom = "auto";
      el.style.top = `${Math.round(caret.bottom - fieldRect.top + 4)}px`;
    }
  },
  _mmHighlightMention(ref) {
    if (!ref || !ref.dropdownEl) return;
    ref.dropdownEl
      .querySelectorAll(`.${this.fig.family}__meeting-modal-mention-item`)
      .forEach((el, i) => {
        el.dataset.active = i === ref.index ? "1" : "0";
      });
  },
  _mmCloseMention() {
    if (!this._mmMention) return;
    this._mmMention = null;
    const root = this.dialogWrapper && this.dialogWrapper.el;
    if (!root) return;
    root.querySelectorAll(`.${this.fig.family}__meeting-modal-mention-dropdown`).forEach((d) => {
      d.dataset.open = "0";
    });
  },

  // Insert the chosen mention/file, replacing the "@token" / "/token" range.
  _mmInsertPick(item) {
    const ref = this._mmMention;
    this._mmCloseMention();
    if (!ref || !item) return;
    const node = ref.node;
    if (!node || node.nodeType !== 3 || !node.isConnected) return;
    const editorEl = this._mmDescEditorEl();
    if (!editorEl) return;
    let chip;
    if (item.kind === "file") {
      if (!item.nid) return;
      chip = this._mmMakeFileChip(item.nid, item.hub, item.name);
    } else {
      if (!item.uid) return;
      chip = this._mmMakeMentionChip(item.uid, item.name);
    }
    const full = node.textContent;
    const parent = node.parentNode;
    const space = document.createTextNode(" ");
    const afterNode = document.createTextNode(full.slice(ref.end));
    node.textContent = full.slice(0, ref.start);
    parent.insertBefore(afterNode, node.nextSibling);
    parent.insertBefore(space, afterNode);
    parent.insertBefore(chip, space);
    const range = document.createRange();
    range.setStart(afterNode, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    editorEl.focus();
  },

  // ── image paste / drop → upload → inline ──────────────────────────────────
  _mmOnPaste(e, editorEl) {
    const dt = e.clipboardData;
    if (!dt) return;
    let file = null;
    const items = dt.items || [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && /^image\//.test(items[i].type || "")) {
        file = items[i].getAsFile();
        break;
      }
    }
    if (!file) return; // let default text paste proceed
    e.preventDefault();
    const sel = window.getSelection();
    let range = null;
    if (sel && sel.rangeCount && editorEl.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0).cloneRange();
    }
    this._mmInsertPastedImage(file, editorEl, range);
  },
  _mmOnDrop(e, editorEl) {
    const dt = e.dataTransfer;
    if (!dt || !dt.files || !dt.files.length) return;
    let file = null;
    for (let i = 0; i < dt.files.length; i++) {
      if (/^image\//.test(dt.files[i].type || "")) {
        file = dt.files[i];
        break;
      }
    }
    if (!file) return;
    e.preventDefault();
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    }
    if (!range || !editorEl.contains(range.startContainer)) range = null;
    this._mmInsertPastedImage(file, editorEl, range);
  },
  async _mmInsertPastedImage(file, editorEl, range) {
    let res;
    try {
      res = await this._mmUploadInlineImage(file);
    } catch (err) {
      if (this.warn) this.warn("meeting inline image upload failed", err);
      return;
    }
    if (!editorEl.isConnected) return;
    const node = this._mmMakeInlineImage(res.nid, res.hub, null, true);
    if (range && editorEl.contains(range.startContainer)) {
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorEl.appendChild(node);
    }
    const DEFAULT_W = 220;
    const img = node.querySelector && node.querySelector("img");
    const applySmall = () => {
      if (!node.isConnected) return;
      const nat = img && img.naturalWidth ? img.naturalWidth : DEFAULT_W;
      node.style.width = `${Math.min(DEFAULT_W, nat)}px`;
    };
    if (img && img.complete && img.naturalWidth) applySmall();
    else if (img) img.addEventListener("load", applySmall, { once: true });
    else node.style.width = `${DEFAULT_W}px`;
  },
  _mmUploadInlineImage(file) {
    return new Promise((resolve, reject) => {
      const params = { hub_id: this._mmHubId(), nid: this._mmDestNid() };
      let xhr;
      try {
        xhr = this.uploadFile(file, params);
      } catch (e) {
        return reject(e);
      }
      if (!xhr) return reject(new Error("upload failed to start"));
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { data } = JSON.parse(xhr.responseText);
            const nid = (data && (data.nid || data.id)) || null;
            if (!nid) return reject(new Error("no nid in upload response"));
            resolve({ nid, hub: (data && data.hub_id) || this._mmHubId() });
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`upload http ${xhr.status}`));
        }
      });
    });
  },
};

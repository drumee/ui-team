// src/drumee/builtins/media/bundle/entry.js
// Build a BundleEntry tree from the 3 upload sources.
// BundleEntry = { id, kind:'file'|'folder', name, relpath, size, source, children[], status, error }

const IGNORED_FILES = /^(\.DS_Store|__MACOSX|Thumbs\.db|\.localized)$/i;

let _seq = 0;
function makeId() { _seq += 1; return `be_${_seq}`; }

/**
 * Pure: assemble a nested tree from a flat list of items.
 * @param {Array<{relpath:string, size:number, source:*}>} items
 *   relpath uses "/" separators, e.g. "docs/a/file.txt". Plain files have no "/".
 * @returns {Array} roots (BundleEntry[])
 */
function buildTreeFromPaths(items) {
  const roots = [];
  const folderIndex = new Map(); // relpath -> folder entry

  const ensureFolder = (parts) => {
    // parts: array of folder segments; returns the deepest folder entry (or null for root)
    let parentChildren = roots;
    let accum = [];
    let current = null;
    for (const seg of parts) {
      accum.push(seg);
      const key = accum.join("/");
      let folder = folderIndex.get(key);
      if (!folder) {
        folder = {
          id: makeId(), kind: "folder", name: seg, relpath: key,
          size: 0, source: null, children: [], status: "queued",
        };
        folderIndex.set(key, folder);
        parentChildren.push(folder);
      }
      parentChildren = folder.children;
      current = folder;
    }
    return current;
  };

  for (const it of items) {
    const segs = it.relpath.split("/").filter((s) => s.length);
    const name = segs[segs.length - 1];
    if (IGNORED_FILES.test(name)) continue;
    const parentParts = segs.slice(0, -1);
    const fileEntry = {
      id: makeId(), kind: "file", name, relpath: it.relpath,
      size: it.size || 0, source: it.source, children: [], status: "queued",
    };
    if (parentParts.length === 0) {
      roots.push(fileEntry);
    } else {
      const folder = ensureFolder(parentParts);
      folder.children.push(fileEntry);
    }
  }
  computeSize(roots);
  return roots;
}

/** Recursively sum file sizes into folder.size. Returns total. */
function computeSize(entries) {
  let total = 0;
  for (const e of entries) {
    if (e.kind === "file") { total += e.size || 0; }
    else { e.size = computeSize(e.children); total += e.size; }
  }
  return total;
}

/** Total bytes across a forest of roots. Note: re-runs computeSize, which mutates each folder.size. */
function countSize(roots) { return computeSize(roots); }

/**
 * Browser: from an <input multiple>/<input webkitdirectory> FileList.
 * webkitRelativePath gives folder structure ("dir/sub/file"); plain files give "".
 */
function entriesFromFileList(fileList) {
  const items = [];
  for (const f of Array.from(fileList || [])) {
    const rel = f.webkitRelativePath && f.webkitRelativePath.length
      ? f.webkitRelativePath : f.name;
    items.push({ relpath: rel, size: f.size, source: f });
  }
  return buildTreeFromPaths(items);
}

/**
 * Browser: from a dataTransfer drop result { files:[FileSystemFileEntry], folders:[FileSystemDirectoryEntry] }.
 * Walks directory entries recursively via readEntries. Async.
 */
async function entriesFromDataTransfer(transfer) {
  const items = [];
  const topFolders = []; // names of top-level dropped folders (seed empty ones below)
  const walk = (entry, prefix) => new Promise((resolve) => {
    if (entry.isFile) {
      // size unknown until .file(); fetch it for accurate totals
      entry.file((f) => {
        if (!IGNORED_FILES.test(entry.name)) {
          items.push({ relpath: prefix + entry.name, size: f.size, source: f });
        }
        resolve();
      }, () => resolve());
      return;
    }
    if (entry.isDirectory) {
      if (IGNORED_FILES.test(entry.name)) return resolve();
      const reader = entry.createReader();
      const dirPrefix = prefix + entry.name + "/";
      const all = [];
      const finish = () => Promise.all(all.map((c) => walk(c, dirPrefix))).then(() => resolve());
      const readBatch = () => reader.readEntries((batch) => {
        if (!batch.length) { finish(); return; }
        all.push(...batch);
        readBatch();
      }, finish);   // on error: still walk what we already read, then resolve
      readBatch();
      return;
    }
    resolve();
  });

  const tasks = [];
  for (const f of (transfer.files || [])) tasks.push(walk(f, ""));
  for (const d of (transfer.folders || [])) {
    if (d && d.name && !IGNORED_FILES.test(d.name)) topFolders.push(d.name);
    tasks.push(walk(d, ""));
  }
  await Promise.all(tasks);
  const roots = buildTreeFromPaths(items);
  // buildTreeFromPaths materializes a folder only as the ancestor of a file, so a
  // dropped top-level folder with no non-ignored files (empty / only .DS_Store /
  // only empty subfolders) would vanish silently. Seed an empty folder root for
  // every dropped folder that didn't make it in.
  for (const name of topFolders) {
    if (!roots.some((r) => r.kind === "folder" && r.name === name)) {
      roots.push({
        id: makeId(), kind: "folder", name, relpath: name,
        size: 0, source: null, children: [], status: "queued",
      });
    }
  }
  return roots;
}

module.exports = {
  IGNORED_FILES, makeId,
  buildTreeFromPaths, computeSize, countSize,
  entriesFromFileList, entriesFromDataTransfer,
};

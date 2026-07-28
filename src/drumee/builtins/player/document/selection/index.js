
// Text selection runs on @embedpdf/plugin-selection: it selects by glyph index and
// reports PDFium's own merged per-line rects, so the highlight can't drift from the
// glyphs or overlap itself the way a DOM text overlay does.
//
// One engine and one plugin registry serve every open document window; all plugin
// state is keyed by documentId.
import PDFIUM_WASM_URL from '@embedpdf/pdfium/pdfium.wasm';

let stackPromise;

/**
 * Boot the engine and plugin registry once, lazily. Dynamically imported to keep
 * the plugin stack out of the initial bundle.
 *
 * Resolves null if the stack fails: selection is an enhancement and must never
 * take the renderer down with it.
 */
export function loadSelectionStack() {
  if (stackPromise) return stackPromise;
  stackPromise = (async () => {
    const [{ createPdfiumEngine }, core, interaction, selection] = await Promise.all([
      import('@embedpdf/engines/pdfium-direct-engine'),
      import('@embedpdf/core'),
      import('@embedpdf/plugin-interaction-manager'),
      import('@embedpdf/plugin-selection'),
    ]);

    // fontFallback: null — the fallback packs fetch fonts from a remote host on
    // demand. We only ask this engine for text geometry, never for pixels.
    const engine = await createPdfiumEngine(PDFIUM_WASM_URL, { fontFallback: null });

    const registry = new core.PluginRegistry(engine);
    registry.registerPluginBatch([
      { package: interaction.InteractionManagerPluginPackage },
      { package: selection.SelectionPluginPackage },
    ]);
    await registry.initialize();
    await registry.pluginsReady();

    // Ids off the manifests, not hardcoded — a rename upstream would otherwise be
    // a silent null at runtime.
    const selectionId = selection.SelectionPluginPackage.manifest.id;
    const interactionId = interaction.InteractionManagerPluginPackage.manifest.id;
    const selectionPlugin = registry.getPlugin(selectionId);
    const interactionPlugin = registry.getPlugin(interactionId);
    if (!selectionPlugin || !interactionPlugin) {
      throw new Error('selection plugins failed to register');
    }

    // Only the React/Preact builds bundle a clipboard writer; the vanilla entry
    // leaves it to us.
    const selectionCapability = selectionPlugin.provides();
    selectionCapability.onCopyToClipboard(({ text }) => {
      if (!text) return;
      writeClipboard(text);
    });

    return {
      core,
      engine,
      registry,
      selectionPlugin,
      selection: selectionCapability,
      interaction: interactionPlugin.provides(),
    };
  })().catch((e) => {
    // Latch the failure — retrying a broken boot on every page would spin.
    stackPromise = Promise.resolve(null);
    if (typeof console !== 'undefined') {
      console.warn('PDF selection unavailable', e);
    }
    return null;
  });
  return stackPromise;
}

/**
 * Copy text, preferring the async clipboard and falling back to a detached
 * textarea where it is unavailable (non-secure contexts, older Safari).
 */
export function writeClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => legacyClipboard(text));
    return;
  }
  legacyClipboard(text);
}

function legacyClipboard(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  // Off-screen rather than hidden: execCommand('copy') needs a focusable,
  // rendered element to select from.
  area.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
  document.body.appendChild(area);
  try {
    area.select();
    document.execCommand('copy');
  } catch (e) {
    /* nothing else to try */
  } finally {
    area.remove();
  }
}

/**
 * Register one open PDF so its pages can be selected.
 *
 * This engine parses the bytes a second time — the renderer keeps its own PDFium
 * document, tuned for fit-to-width and DPR capping that the engine's Blob API
 * can't express. Worth unifying separately; not a correctness issue.
 *
 * Resolves null when selection is unavailable; callers carry on without it.
 */
export async function openSelectionDocument(documentId, data, ownerEl) {
  const stack = await loadSelectionStack();
  if (!stack) return null;
  const { core, engine, registry, selection, interaction } = stack;

  let document_;
  try {
    document_ = await engine
      .openDocumentBuffer({ id: documentId, content: toArrayBuffer(data) })
      .toPromise();
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('PDF selection: document rejected by engine', e);
    }
    return null;
  }

  // The plugins read pages and rotation out of core's store, so the document has
  // to be announced there as well as opened on the engine.
  const store = registry.getStore();
  store.dispatch(core.startLoadingDocument(documentId));
  store.dispatch(core.setDocumentLoaded(documentId, document_));

  // Selection only runs in modes that opt in, per document. We never switch modes.
  try {
    selection.enableForMode(interaction.getDefaultMode(), undefined, documentId);
  } catch (e) {
    /* older builds enable the default mode implicitly */
  }

  const detachCopy = attachCopyAffordances(documentId, stack, ownerEl);

  return {
    documentId,
    document: document_,
    stack,
    close: () => {
      detachCopy();
      try {
        store.dispatch(core.closeDocument(documentId));
      } catch (e) { /* already gone */ }
      try {
        engine.closeDocument(document_);
      } catch (e) { /* already gone */ }
    },
  };
}

/**
 * Marks a page's pointer surface so a right-click can be recognised as landing on
 * the PDF. Stamped by the page widget rather than matched by BEM class: the class
 * is derived from the widget's own `fig.family`, and hardcoding it here would
 * couple two modules through a string that no build step checks.
 */
export const SELECTION_SURFACE_ATTR = 'data-pdf-selection';
const SELECTION_SURFACE = `[${SELECTION_SURFACE_ATTR}]`;

/**
 * Ctrl/Cmd+C and a right-click Copy menu for one document.
 *
 * The selection is not a DOM selection, so neither native Ctrl+C nor the native
 * context menu can see it. Owned per document, not per page: a selection can span
 * pages and the plugin copies the whole range, so per-page listeners would copy
 * once per page.
 */
// Which document the user touched last. Selections are per document and are not
// cleared by activity in another one, so with two PDF windows open both can hold
// a selection at once — without this, one Ctrl+C would copy from both.
let lastActiveDocumentId = null;

function attachCopyAffordances(documentId, stack, ownerEl) {
  const { selection } = stack;
  let menu = null;

  const hasSelection = () => {
    try {
      const state = selection.getState(documentId);
      return !!(state && state.selection);
    } catch (e) {
      return false;
    }
  };

  const closeMenu = () => {
    if (!menu) return;
    menu.remove();
    menu = null;
  };

  const owns = (node) => !ownerEl || (node && ownerEl.contains(node));

  const onKeyDown = (event) => {
    if (event.key !== 'c' && event.key !== 'C') return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (lastActiveDocumentId && lastActiveDocumentId !== documentId) return;
    if (!hasSelection()) return;
    // Only claim the shortcut when the user is not typing somewhere — a rename
    // field or the chat composer must keep its own copy behaviour.
    const active = document.activeElement;
    if (active && active.closest && active.closest('input, textarea, [contenteditable="true"]')) {
      return;
    }
    event.preventDefault();
    selection.copyToClipboard(documentId);
  };

  const onContextMenu = (event) => {
    closeMenu();
    const surface = event.target && event.target.closest
      ? event.target.closest(SELECTION_SURFACE)
      : null;
    if (!surface || !owns(surface) || !hasSelection()) return;
    // Take the event before ui-core's own handler, which would otherwise open the
    // window context menu over the selection.
    event.preventDefault();
    event.stopPropagation();

    menu = document.createElement('div');
    menu.className = 'player-page__copy-menu';
    menu.textContent = LOCALE.COPY;
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selection.copyToClipboard(documentId);
      closeMenu();
    });
    document.body.appendChild(menu);
  };

  const onPointerDown = (event) => {
    if (owns(event.target)) lastActiveDocumentId = documentId;
    if (menu && !menu.contains(event.target)) closeMenu();
  };

  // Capture phase for contextmenu so it runs before the inline oncontextmenu
  // ui-core installs on every widget element.
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onPointerDown, true);
  const stopChange = selection.onSelectionChange(() => closeMenu());

  return () => {
    document.removeEventListener('contextmenu', onContextMenu, true);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointerdown', onPointerDown, true);
    if (stopChange) stopChange();
    if (lastActiveDocumentId === documentId) lastActiveDocumentId = null;
    closeMenu();
  };
}

/**
 * The engine wants a plain ArrayBuffer; the loader hands us a Uint8Array view
 * that may be a window onto a larger buffer, so slice rather than hand over
 * `.buffer` and silently include the neighbours.
 */
function toArrayBuffer(data) {
  if (data instanceof ArrayBuffer) return data;
  if (data && data.buffer instanceof ArrayBuffer) {
    return data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
      ? data.buffer
      : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  return data;
}

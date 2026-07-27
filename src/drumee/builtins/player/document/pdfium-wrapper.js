
// Bundled by webpack as an asset/resource — resolves to the public URL of the
// self-hosted pdfium.wasm copied into the build output.
import PDFIUM_WASM_URL from '@embedpdf/pdfium/pdfium.wasm';

let pdfiumInstance;

// Upper bound on one page's RGBA bitmap, in pixels (16 MP ≈ 64 MB).
// A maximized page on a 4K display at devicePixelRatio 2 asks for a ~7700 px
// wide raster — tens of megapixels per page, which exhausts the wasm heap and
// exceeds Safari's canvas area limit, so the render fails outright. Capping the
// buffer (never the CSS size) keeps the page filling its container and costs
// only a little sharpness on very large screens.
const MAX_RASTER_PIXELS = 16e6;

// Virtual device box used to normalize extracted text geometry.
// FPDF_PageToDevice reports whole device pixels, so a deliberately huge device
// keeps the rounding error at 1/TEXT_DEVICE_UNITS of the page — far under one
// screen pixel at any zoom the player can reach.
const TEXT_DEVICE_UNITS = 100000;

const CHAR_LF = 10;
const CHAR_CR = 13;

/**
 * Pull the page's text out of PDFium as positioned runs.
 *
 * Returns `{ rotation, aspect, items: [{ text, left, top, width, height,
 * endOfLine }] }` where the geometry is normalized to `[0..1]` over the page with
 * ALL rotation undone, `rotation` is the page's own /Rotate in degrees and
 * `aspect` is the un-rotated page's height/width. Keeping it unit-less and
 * rotation-free is what lets one extraction serve every later re-raster.
 *
 * One item per WORD, not per line. A line-long item would have to rely on the
 * browser to distribute characters inside it, and browser font metrics don't
 * match the PDF's own glyph placement — the width can be forced to match while
 * the characters inside drift, which puts the selection highlight several
 * characters away from the text it appears to cover. A word is short enough that
 * the residual drift is invisible.
 */
function extractPageText(pdfium, pagePtr) {
  const textPtr = pdfium.FPDFText_LoadPage(pagePtr);
  if (!textPtr) return null;

  const { malloc, free } = pdfium.pdfium.wasmExports;
  const { getValue } = pdfium.pdfium;
  const rectPtr = malloc(16); // FS_RECTF — 4 floats: left, top, right, bottom
  const devPtr = malloc(8);   // two ints — FPDF_PageToDevice out-params

  // A page's own /Rotate is cancelled out here and handed back to the caller to
  // apply as one CSS rotation on the layer. Left in, every run on such a page
  // would be a tall narrow box holding horizontally laid-out text — selectable,
  // but with the characters in the wrong places inside the line.
  const quarter = ((pdfium.FPDFPage_GetRotation(pagePtr) || 0) % 4 + 4) % 4;
  const unrotate = (4 - quarter) % 4;

  // Page-space point → normalized position on the un-rotated page. This goes
  // through PDFium's own page→device transform rather than dividing by the page
  // box, because that transform is also what the renderer uses: a document with
  // an offset CropBox stays aligned with the bitmap instead of drifting by the
  // crop origin.
  const toNorm = (px, py) => {
    pdfium.FPDF_PageToDevice(
      pagePtr, 0, 0, TEXT_DEVICE_UNITS, TEXT_DEVICE_UNITS, unrotate, px, py, devPtr, devPtr + 4
    );
    return [
      getValue(devPtr, 'i32') / TEXT_DEVICE_UNITS,
      getValue(devPtr + 4, 'i32') / TEXT_DEVICE_UNITS,
    ];
  };

  const items = [];
  let run = null;

  const flush = (endOfLine) => {
    if (!run) return;
    const text = run.chars.join('');
    if (text.trim()) {
      const [u0, v0] = toNorm(run.left, run.top);
      const [u1, v1] = toNorm(run.right, run.bottom);
      items.push({
        text,
        left: Math.min(u0, u1),
        top: Math.min(v0, v1),
        width: Math.abs(u1 - u0),
        height: Math.abs(v1 - v0),
        endOfLine: !!endOfLine,
      });
    } else if (endOfLine && items.length) {
      // Whitespace-only run — drop the span but keep the line break it carried,
      // otherwise the copied text loses a newline.
      items[items.length - 1].endOfLine = true;
    }
    run = null;
  };

  try {
    const count = pdfium.FPDFText_CountChars(textPtr);
    for (let i = 0; i < count; i++) {
      const code = pdfium.FPDFText_GetUnicode(textPtr, i);
      if (code === CHAR_LF || code === CHAR_CR) {
        flush(true);
        continue;
      }
      // 0 is an unmapped glyph (no ToUnicode entry); anything outside the
      // Unicode range would make fromCodePoint throw.
      if (!code || code > 0x10ffff) continue;
      if (!pdfium.FPDFText_GetLooseCharBox(textPtr, i, rectPtr)) continue;

      // Loose boxes (not tight ones) because they carry the font's ascent and
      // descent, so a run's box matches the line band a user expects to see
      // highlighted rather than hugging the ink.
      const left = getValue(rectPtr, 'float');
      const top = getValue(rectPtr + 4, 'float');
      const right = getValue(rectPtr + 8, 'float');
      const bottom = getValue(rectPtr + 12, 'float');

      const ch = String.fromCodePoint(code);
      const blank = !ch.trim();

      // Grouping happens in PAGE space, which is the space the text actually
      // runs in — a page with an intrinsic /Rotate has its lines along page-x
      // even though they read vertically on screen.
      if (run) {
        const size = Math.max(run.top - run.bottom, 1);
        const sameLine = Math.abs(top - run.top) <= size * 0.5
          && Math.abs(bottom - run.bottom) <= size * 0.5;
        const gap = left - run.right;
        if (!sameLine) {
          flush(true);
        } else if (gap > size * 0.6 || gap < -size) {
          // A wide gap is a column/tab break, not a word break. Close the run,
          // keeping a space so the copied text doesn't glue the two sides
          // together — the PDF expressed that separation as coordinates rather
          // than as a space character.
          if (!run.spaced) run.chars.push(' ');
          flush(false);
        } else if (run.spaced && !blank) {
          // The run already carries its trailing whitespace, so this character
          // begins the next word. One span per word is what keeps the highlight
          // on top of the glyphs.
          flush(false);
        }
      }

      if (!run) {
        if (blank) continue; // never open a run on whitespace
        run = { chars: [], left, top, right, bottom, spaced: false };
      }

      run.chars.push(ch);
      if (blank) run.spaced = true;
      run.left = Math.min(run.left, left);
      run.right = Math.max(run.right, right);
      run.top = Math.max(run.top, top);       // page space is y-up
      run.bottom = Math.min(run.bottom, bottom);
    }
    flush(true);
  } finally {
    free(rectPtr);
    free(devPtr);
    pdfium.FPDFText_ClosePage(textPtr);
  }

  // GetPageWidthF/HeightF report the DISPLAYED size, so a quarter turn has to be
  // undone here too for the aspect to describe the space the items live in.
  const dispW = pdfium.FPDF_GetPageWidthF(pagePtr);
  const dispH = pdfium.FPDF_GetPageHeightF(pagePtr);
  const aspect = (quarter === 1 || quarter === 3)
    ? (dispH ? dispW / dispH : 1)
    : (dispW ? dispH / dispW : 1);

  return { items, rotation: quarter * 90, aspect };
}

export async function initializePdfium() {
  const { init, DEFAULT_PDFIUM_WASM_URL } = await import('@embedpdf/pdfium');
  if (pdfiumInstance) return pdfiumInstance;

  /** Prefer a runtime override, then the self-hosted bundle, then the CDN default */
  let { pdfium_wasm } = bootstrap();
  let wasmUrl = PDFIUM_WASM_URL;

  let response = await fetch(wasmUrl);
  if (response.status != 200) {
    response = await fetch(DEFAULT_PDFIUM_WASM_URL);
  }
  const wasmBinary = await response.arrayBuffer();
  pdfiumInstance = await init({ wasmBinary });

  // Initialize the PDFium extension library
  // This is required before performing any PDF operations
  pdfiumInstance.PDFiumExt_Init();

  return pdfiumInstance;
}

/**
 * Loads a PDF document and returns an object with methods to access and render it.
 * This avoids loading the document multiple times for different operations.
 */
export async function loadPdfDocument(pdfData) {
  // Initialize PDFium
  const pdfium = await initializePdfium();

  // Allocate memory for the PDF data
  const filePtr = pdfium.pdfium.wasmExports.malloc(pdfData.length);
  pdfium.pdfium.HEAPU8.set(pdfData, filePtr);

  // Load the document
  const docPtr = pdfium.FPDF_LoadMemDocument(filePtr, pdfData.length, 0);
  if (!docPtr) {
    const error = pdfium.FPDF_GetLastError();
    pdfium.pdfium.wasmExports.free(filePtr);

    // Handle password-protected documents
    if (error === 4) {
      return {
        hasPassword: true,
        pageCount: 0,
        close: () => { }, // No-op since no document was loaded
        getPageCount: () => 0,
        getPageText: async () => null,
        renderPage: async () => { throw new Error('Document is password protected'); }
      };
    }

    throw new Error(`Failed to load PDF: ${error}`);
  }

  // Get page count
  const pageCount = pdfium.FPDF_GetPageCount(docPtr);

  // Extracted text geometry, keyed by page index. It is normalized and
  // rotation-free, so it survives every zoom/resize re-raster — text extraction
  // costs about as much as a render and must not be repeated per resize.
  const textCache = new Map();

  // Return an object with document info and rendering capabilities
  return {
    hasPassword: false,
    pageCount,
    // Close the document and free resources
    close: () => {
      textCache.clear();
      pdfium.FPDF_CloseDocument(docPtr);
      pdfium.pdfium.wasmExports.free(filePtr);
    },

    // Get the current page count (useful if pages are added/removed)
    getPageCount: () => pdfium.FPDF_GetPageCount(docPtr),

    /**
     * Positioned text runs for one page, or `null` when the page carries no
     * extractable text (a scanned image, for instance). Cached per page.
     */
    getPageText: async (pageIndex) => {
      if (pageIndex < 0 || pageIndex >= pageCount) return null;
      if (textCache.has(pageIndex)) return textCache.get(pageIndex);

      const pagePtr = pdfium.FPDF_LoadPage(docPtr, pageIndex);
      if (!pagePtr) return null;
      let result = null;
      try {
        result = extractPageText(pdfium, pagePtr);
      } catch (e) {
        // A broken text tree must not take the page render down with it.
        result = null;
      } finally {
        pdfium.FPDF_ClosePage(pagePtr);
      }
      textCache.set(pageIndex, result);
      return result;
    },

    // Render a specific page to a canvas
    renderPage: async (
      pageIndex,
      scale = 1.0,
      rotation = 0,
      canvas,
      dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1.0,
      fitWidth = 0
    ) => {
      // Check if the page index is valid
      if (pageIndex < 0 || pageIndex >= pageCount) {
        throw new Error(`Invalid page index: ${pageIndex}. Document has ${pageCount} pages.`);
      }

      // Load the page
      const pagePtr = pdfium.FPDF_LoadPage(docPtr, pageIndex);
      if (!pagePtr) {
        throw new Error(`Failed to load page ${pageIndex}`);
      }

      try {
        // Get the page dimensions
        const width = pdfium.FPDF_GetPageWidthF(pagePtr);
        const height = pdfium.FPDF_GetPageHeightF(pagePtr);

        // `fitWidth` (CSS px) asks for a page that ends up exactly that wide.
        // Deriving the scale from THIS page's own dimensions is what makes a
        // mixed-size document render uniformly: the caller only knows the first
        // page's size, so a shared scale renders every differently-sized page at
        // a different on-screen width. Rotation swaps which dimension faces the
        // container, so measure the one that will become the displayed width.
        const rotated = rotation === 90 || rotation === 270;
        const naturalWidth = rotated ? height : width;
        let cssScale = scale;
        if (fitWidth > 0 && naturalWidth > 0) {
          cssScale = fitWidth / naturalWidth;
        }

        // Clamp the DPR, not the CSS scale: the page must still be laid out at
        // the requested width, it just gets rasterized at fewer device pixels.
        let effectiveDpr = dpr;
        const pixels = width * cssScale * height * cssScale * dpr * dpr;
        if (pixels > MAX_RASTER_PIXELS) {
          effectiveDpr = dpr * Math.sqrt(MAX_RASTER_PIXELS / pixels);
        }
        const effectiveScale = cssScale * effectiveDpr;
        let scaledWidth = Math.floor(width * effectiveScale);
        let scaledHeight = Math.floor(height * effectiveScale);

        // Apply rotation if requested
        let rotateFlag = 0;
        switch (rotation) {
          case 90: rotateFlag = 1; break;
          case 180: rotateFlag = 2; break;
          case 270: rotateFlag = 3; break;
        }

        // Swap dimensions for 90 and 270 degree rotations
        if (rotation === 90 || rotation === 270) {
          [scaledWidth, scaledHeight] = [scaledHeight, scaledWidth];
        }

        // Create a bitmap for rendering
        const bitmapPtr = pdfium.FPDFBitmap_Create(scaledWidth, scaledHeight, 0);
        if (!bitmapPtr) {
          throw new Error('Failed to create bitmap');
        }

        try {
          // Set canvas CSS dimensions for proper display
          canvas.style.width = `${scaledWidth / effectiveDpr}px`;
          canvas.style.height = `${scaledHeight / effectiveDpr}px`;

          // Set actual canvas buffer size
          canvas.width = scaledWidth;
          canvas.height = scaledHeight;

          // Fill the bitmap with white background
          pdfium.FPDFBitmap_FillRect(bitmapPtr, 0, 0, scaledWidth, scaledHeight, 0xFFFFFFFF);

          // Render the page to the bitmap
          pdfium.FPDF_RenderPageBitmap(
            bitmapPtr,
            pagePtr,
            0,
            0,
            scaledWidth,
            scaledHeight,
            rotateFlag,
            16  // Use FPDF_REVERSE_BYTE_ORDER flag for correct color representation
          );

          // Get the bitmap buffer
          const bufferPtr = pdfium.FPDFBitmap_GetBuffer(bitmapPtr);
          if (!bufferPtr) {
            throw new Error('Failed to get bitmap buffer');
          }

          const bufferSize = scaledWidth * scaledHeight * 4; // RGBA

          // Create a COPY of the buffer data to prevent memory issues
          // This is crucial - we must slice() to copy the data instead of using a view
          const buffer = new Uint8Array(
            pdfium.pdfium.HEAPU8.buffer,
            pdfium.pdfium.HEAPU8.byteOffset + bufferPtr,
            bufferSize
          ).slice();

          // Create ImageData from the buffer copy
          const imageData = new ImageData(
            new Uint8ClampedArray(buffer.buffer),
            scaledWidth,
            scaledHeight
          );

          // Draw the image data to the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
          }
          ctx.putImageData(imageData, 0, 0);

          // Return the dimensions adjusted for DPR
          return {
            width: scaledWidth / effectiveDpr,
            height: scaledHeight / effectiveDpr
          };
        } finally {
          // Clean up bitmap
          pdfium.FPDFBitmap_Destroy(bitmapPtr);
        }
      } finally {
        // Clean up page
        pdfium.FPDF_ClosePage(pagePtr);
      }
    }
  };
}

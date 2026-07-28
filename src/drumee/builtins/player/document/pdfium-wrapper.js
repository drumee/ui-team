
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
        renderPage: async () => { throw new Error('Document is password protected'); }
      };
    }

    throw new Error(`Failed to load PDF: ${error}`);
  }

  // Get page count
  const pageCount = pdfium.FPDF_GetPageCount(docPtr);

  // Return an object with document info and rendering capabilities
  return {
    hasPassword: false,
    pageCount,
    // Close the document and free resources
    close: () => {
      pdfium.FPDF_CloseDocument(docPtr);
      pdfium.pdfium.wasmExports.free(filePtr);
    },

    // Get the current page count (useful if pages are added/removed)
    getPageCount: () => pdfium.FPDF_GetPageCount(docPtr),


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

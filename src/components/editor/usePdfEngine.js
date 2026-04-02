/**
 * usePdfEngine.js
 * Core PDF.js integration hook.
 * Handles: loading, rendering pages to canvas, extracting textContent with coordinates.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Point PDF.js worker to the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const SCALE = 1.5; // Base render scale for crisp output

export function usePdfEngine() {
  const [pdfDoc, setPdfDoc] = useState(null);      // raw PDFDocumentProxy
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const renderTaskRefs = useRef({});                // track ongoing render tasks per page

  /** Load a PDF from a File object or ArrayBuffer */
  const loadPdf = useCallback(async (fileOrBuffer) => {
    setIsLoading(true);
    setError(null);
    try {
      let typedArray;
      if (fileOrBuffer instanceof File) {
        const buf = await fileOrBuffer.arrayBuffer();
        typedArray = new Uint8Array(buf);
      } else {
        typedArray = new Uint8Array(fileOrBuffer);
      }
      const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      return doc;
    } catch (err) {
      setError(err.message || 'Failed to load PDF');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Render a single page to a given <canvas> element.
   * Returns the actual viewport used (needed for overlay alignment).
   */
  const renderPage = useCallback(async (doc, pageNumber, canvas, zoom = 1.0) => {
    if (!doc || !canvas) return null;
    // Cancel any previous in-progress render for this page
    if (renderTaskRefs.current[pageNumber]) {
      try { renderTaskRefs.current[pageNumber].cancel(); } catch (_) {}
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: SCALE * zoom });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    const renderTask = page.render({ canvasContext: ctx, viewport });
    renderTaskRefs.current[pageNumber] = renderTask;

    await renderTask.promise;
    return { viewport, page };
  }, []);

  /**
   * Extract text items with positions for a page.
   * Each item: { str, x, y, width, height, fontSize, fontName }
   * Coordinates are in canvas pixels (scaled).
   */
  const extractTextItems = useCallback(async (doc, pageNumber, viewport) => {
    if (!doc || !viewport) return [];
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();

    return textContent.items.map((item) => {
      // PDF.js transform: [scaleX, skewX, skewY, scaleY, tx, ty]
      const [, , , scaleY, tx, ty] = item.transform;
      // Convert PDF coordinate (bottom-left origin) to canvas (top-left origin)
      const x = (tx * viewport.scale);
      const y = viewport.height - (ty * viewport.scale);
      const fontSize = Math.abs(scaleY) * viewport.scale;
      const width = item.width * viewport.scale;
      const height = item.height !== 0 ? item.height * viewport.scale : fontSize * 1.2;

      return {
        id: `p${pageNumber}_${Math.random().toString(36).substr(2, 6)}`,
        str: item.str,
        x,
        y: y - fontSize,  // shift up by font-size so top-left is the origin
        width: Math.max(width, 4),
        height: Math.max(height, fontSize),
        fontSize,
        fontName: item?.fontName || 'sans-serif',
        dir: item.dir || 'ltr',
        pageNumber,
        // Original snapshot (for change-tracking)
        originalStr: item.str,
        originalX: tx * viewport.scale,
        originalY: viewport.height - (ty * viewport.scale),
      };
    }).filter(item => item.str.trim() !== '');
  }, []);

  /** Generate thumbnail data URLs for the page sidebar */
  const generateThumbnail = useCallback(async (doc, pageNumber) => {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.3 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  return {
    pdfDoc,
    numPages,
    error,
    isLoading,
    loadPdf,
    renderPage,
    extractTextItems,
    generateThumbnail,
    SCALE,
  };
}

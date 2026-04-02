/**
 * PdfPageCanvas.jsx
 * Renders a single PDF page and its editable text overlay layer.
 * The canvas and overlay div are identically sized so coordinates align.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import TextOverlayItem from './TextOverlayItem';
import { TOOLS } from './useEditorState';

const PdfPageCanvas = ({
  pdfDoc,
  pageNumber,
  zoom,
  items,
  selectedId,
  tool,
  onSelect,
  onCanvasClick,
  onTextChange,
  onPositionChange,
  onDelete,
  onRendered, // ({ viewport }) => void
}) => {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const vp = page.getViewport({ scale: 1.5 * zoom });

        const canvas = canvasRef.current;
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        if (!cancelled) {
          setViewport(vp);
          setIsRendering(false);
          onRendered && onRendered({ viewport: vp, pageNumber });
        }
      } catch (err) {
        if (!cancelled) setIsRendering(false);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber, zoom, onRendered]);

  const handleOverlayClick = useCallback((e) => {
    if (tool !== TOOLS.ADD_TEXT) {
      onSelect(null); // deselect
      return;
    }
    if (!viewport) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    onCanvasClick(pageNumber, x, y);
  }, [tool, viewport, zoom, pageNumber, onCanvasClick, onSelect]);

  const canvasWidth = viewport?.width ?? 0;
  const canvasHeight = viewport?.height ?? 0;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        userSelect: 'none',
      }}
    >
      {/* The actual PDF rendering canvas */}
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Transparent overlay div — same size, with pointer events for text editing */}
      {!isRendering && viewport && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: canvasWidth,
            height: canvasHeight,
            cursor: tool === TOOLS.ADD_TEXT ? 'crosshair' : 'default',
          }}
        >
          {(items || []).map(item => (
            <TextOverlayItem
              key={item.id}
              item={item}
              zoom={zoom}
              isSelected={selectedId === item.id}
              tool={tool}
              onSelect={onSelect}
              onTextChange={(id, text) => onTextChange(pageNumber, id, text)}
              onPositionChange={(id, x, y) => onPositionChange(pageNumber, id, x, y)}
              onDelete={(id) => onDelete(pageNumber, id)}
            />
          ))}
        </div>
      )}

      {/* Loading shimmer */}
      {isRendering && (
        <div
          style={{ position: 'absolute', inset: 0, background: '#1e2433', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="w-8 h-8 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* Page label */}
      <div style={{
        position: 'absolute', bottom: -28, left: 0, right: 0,
        textAlign: 'center', fontSize: 11, color: '#6b7280',
        pointerEvents: 'none',
      }}>
        Page {pageNumber}
      </div>
    </div>
  );
};

export default PdfPageCanvas;

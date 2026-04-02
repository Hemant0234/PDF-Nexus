/**
 * useEditorState.js
 * Manages all editing state:
 *   - text items per page
 *   - active edits (changes)
 *   - undo/redo stack
 *   - selected element
 *   - current tool mode
 */
import { useState, useCallback, useRef } from 'react';

export const TOOLS = {
  SELECT: 'select',
  ADD_TEXT: 'addText',
  HIGHLIGHT: 'highlight',
};

export function useEditorState() {
  // Map of pageNumber -> array of text items (includes original + edits)
  const [pageItems, setPageItems] = useState({});
  // Currently selected item id
  const [selectedId, setSelectedId] = useState(null);
  // Active tool
  const [tool, setTool] = useState(TOOLS.SELECT);
  // Zoom level (1.0 = 100%)
  const [zoom, setZoom] = useState(1.0);
  // Undo/Redo stacks (each entry = full pageItems snapshot)
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  /** initialise a page's items (called after rendering + extraction) */
  const initPageItems = useCallback((pageNumber, items) => {
    setPageItems(prev => ({ ...prev, [pageNumber]: items }));
  }, []);

  /** snapshot current state for undo */
  const snapshot = useCallback((current) => {
    undoStack.current.push(JSON.parse(JSON.stringify(current)));
    redoStack.current = []; // clear redo on new action
  }, []);

  /** Update a single item's text */
  const updateItemText = useCallback((pageNumber, itemId, newText) => {
    setPageItems(prev => {
      snapshot(prev);
      return {
        ...prev,
        [pageNumber]: prev[pageNumber].map(item =>
          item.id === itemId ? { ...item, str: newText, modified: true } : item
        )
      };
    });
  }, [snapshot]);

  /** Update item position after drag */
  const updateItemPosition = useCallback((pageNumber, itemId, x, y) => {
    setPageItems(prev => {
      snapshot(prev);
      return {
        ...prev,
        [pageNumber]: prev[pageNumber].map(item =>
          item.id === itemId ? { ...item, x, y, modified: true } : item
        )
      };
    });
  }, [snapshot]);

  /** Add a brand-new text element (user clicked canvas in addText mode) */
  const addNewTextItem = useCallback((pageNumber, x, y) => {
    const newItem = {
      id: `new_p${pageNumber}_${Date.now()}`,
      str: 'New Text',
      x,
      y,
      width: 120,
      height: 20,
      fontSize: 14,
      fontName: 'sans-serif',
      dir: 'ltr',
      pageNumber,
      isNew: true,
      modified: true,
    };
    setPageItems(prev => {
      snapshot(prev);
      return {
        ...prev,
        [pageNumber]: [...(prev[pageNumber] || []), newItem]
      };
    });
    setSelectedId(newItem.id);
    return newItem.id;
  }, [snapshot]);

  /** Delete selected item */
  const deleteItem = useCallback((pageNumber, itemId) => {
    setPageItems(prev => {
      snapshot(prev);
      return {
        ...prev,
        [pageNumber]: prev[pageNumber].map(item =>
          item.id === itemId ? { ...item, deleted: true } : item
        )
      };
    });
    setSelectedId(null);
  }, [snapshot]);

  /** Undo */
  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(JSON.parse(JSON.stringify(pageItems)));
    setPageItems(prev);
    setSelectedId(null);
  }, [pageItems]);

  /** Redo */
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(JSON.parse(JSON.stringify(pageItems)));
    setPageItems(next);
    setSelectedId(null);
  }, [pageItems]);

  /** Build the changes payload for the backend */
  const buildChangesPayload = useCallback(() => {
    const changes = [];
    Object.entries(pageItems).forEach(([pageNum, items]) => {
      items.forEach(item => {
        if (item.modified || item.deleted || item.isNew) {
          changes.push({
            page_index: parseInt(pageNum) - 1,
            id: item.id,
            text: item.str,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            fontSize: item.fontSize,
            fontName: item.fontName,
            deleted: !!item.deleted,
            isNew: !!item.isNew,
            originalStr: item.originalStr,
            originalX: item.originalX,
            originalY: item.originalY,
          });
        }
      });
    });
    return changes;
  }, [pageItems]);

  const clampZoom = (z) => Math.min(2.0, Math.max(0.25, z));

  return {
    pageItems,
    selectedId, setSelectedId,
    tool, setTool,
    zoom, setZoom: (z) => setZoom(clampZoom(z)),
    initPageItems,
    updateItemText,
    updateItemPosition,
    addNewTextItem,
    deleteItem,
    undo, redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    buildChangesPayload,
  };
}

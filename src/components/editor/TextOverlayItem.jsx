/**
 * TextOverlayItem.jsx
 * A single editable text block absolutely positioned on top of the PDF canvas.
 * Supports inline editing, drag-to-reposition, and keyboard shortcuts.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';

const TextOverlayItem = ({
  item,
  zoom,
  isSelected,
  onSelect,
  onTextChange,
  onPositionChange,
  onDelete,
  tool,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.str);
  const editRef = useRef(null);
  const dragState = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    setEditValue(item.str);
  }, [item.str]);

  useEffect(() => {
    if (item.isNew && isSelected) {
      setIsEditing(true);
    }
  }, [item.isNew, isSelected]);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const newText = editRef.current?.textContent ?? editValue;
    if (newText !== item.str) {
      onTextChange(item.id, newText);
    }
  }, [editValue, item.id, item.str, onTextChange]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(item.str);
    }
    if (e.key === 'Delete' && !isEditing && isSelected) {
      onDelete(item.id);
    }
  };

  /** Drag handling */
  const handleMouseDown = (e) => {
    if (isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(item.id);

    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
    };

    const handleMouseMove = (me) => {
      if (!dragState.current.active) return;
      const dx = (me.clientX - dragState.current.startX) / zoom;
      const dy = (me.clientY - dragState.current.startY) / zoom;
      onPositionChange(item.id, dragState.current.origX + dx, dragState.current.origY + dy);
    };

    const handleMouseUp = () => {
      dragState.current.active = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (item.deleted) return null;

  const scaledFontSize = item.fontSize * zoom;

  return (
    <div
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: item.x * zoom,
        top: item.y * zoom,
        width: Math.max(item.width * zoom, 20),
        minHeight: scaledFontSize * 1.3,
        fontSize: scaledFontSize,
        fontFamily: item.fontName?.includes('Bold') ? 'serif' : 'sans-serif',
        fontWeight: item.fontName?.toLowerCase().includes('bold') ? 700 : 400,
        lineHeight: 1.2,
        color: item.isNew ? '#1a56db' : 'transparent',
        cursor: isEditing ? 'text' : (tool === 'select' ? 'move' : 'crosshair'),
        zIndex: isSelected ? 20 : 10,
        userSelect: 'none',
        boxSizing: 'border-box',
        whiteSpace: 'pre',
        direction: item.dir || 'ltr',
        // Only show border/background on select or hover
        outline: isSelected ? '1.5px solid #3b82f6' : 'none',
        background: isEditing ? 'rgba(255,255,255,0.9)' : isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
        borderRadius: 2,
        padding: '0 1px',
      }}
    >
      {isEditing ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setIsEditing(false); setEditValue(item.str); }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
          }}
          style={{
            display: 'block',
            outline: 'none',
            color: '#000',
            minWidth: 20,
            whiteSpace: 'pre',
          }}
        >
          {item.str}
        </div>
      ) : (
        <span style={{ pointerEvents: 'none', color: item.isNew ? '#1a56db' : 'inherit' }}>
          {item.str}
        </span>
      )}
    </div>
  );
};

export default React.memo(TextOverlayItem);

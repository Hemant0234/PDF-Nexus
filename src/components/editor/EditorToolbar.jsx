/**
 * EditorToolbar.jsx
 * Top toolbar: tool selector, zoom, undo/redo, export button.
 */
import React from 'react';
import { TOOLS } from './useEditorState';
import {
  Cursor, TextT, ArrowCounterClockwise, ArrowClockwise,
  DownloadSimple, MagnifyingGlassPlus, MagnifyingGlassMinus,
  Keyboard,
} from '@phosphor-icons/react';

const Divider = () => <div className="h-6 w-px bg-gray-700 mx-1" />;

const ToolBtn = ({ active, onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-gray-300 hover:text-white hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
);

const EditorToolbar = ({
  filename,
  tool, setTool,
  zoom, setZoom,
  canUndo, canRedo,
  onUndo, onRedo,
  onExport,
  isExporting,
  changesCount,
}) => {
  return (
    <div className="flex items-center gap-2 flex-1 flex-wrap">
      {/* Tool group */}
      <div className="flex items-center gap-0.5 bg-gray-900 p-1 rounded-xl border border-gray-700">
        <ToolBtn active={tool === TOOLS.SELECT} onClick={() => setTool(TOOLS.SELECT)} title="Select / Move (V)">
          <Cursor size={15} weight="bold" /> Select
        </ToolBtn>
        <ToolBtn active={tool === TOOLS.ADD_TEXT} onClick={() => setTool(TOOLS.ADD_TEXT)} title="Click anywhere to add text (T)">
          <TextT size={15} weight="bold" /> Add Text
        </ToolBtn>
      </div>

      <Divider />

      {/* Zoom controls */}
      <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-xl border border-gray-700">
        <button
          onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
          className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
          title="Zoom Out (25%)"
        >
          <MagnifyingGlassMinus size={15} />
        </button>
        <span className="text-gray-300 text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.min(2.0, zoom + 0.25))}
          className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
          title="Zoom In (200% max)"
        >
          <MagnifyingGlassPlus size={15} />
        </button>
      </div>

      <Divider />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 text-gray-400 disabled:opacity-25 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
          title="Undo (Ctrl+Z)"
        >
          <ArrowCounterClockwise size={15} weight="bold" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 text-gray-400 disabled:opacity-25 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
          title="Redo (Ctrl+Y)"
        >
          <ArrowClockwise size={15} weight="bold" />
        </button>
      </div>

      <div className="flex-1" />

      {/* Export */}
      <button
        onClick={onExport}
        disabled={isExporting || changesCount === 0}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/30"
        title="Save & Download Edited PDF"
      >
        {isExporting ? (
          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <DownloadSimple size={15} weight="bold" />
        )}
        {isExporting ? 'Saving...' : `Save PDF${changesCount > 0 ? ` (${changesCount})` : ''}`}
      </button>
    </div>
  );
};

export default EditorToolbar;

/**
 * EditPDFView.jsx — Sejda-style PDF Editor with accurate font matching
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UploadSimple, DownloadSimple, WarningCircle, CheckCircle, TextT, Cursor, Scan } from '@phosphor-icons/react';
import API_BASE from '../api';

// ═══════════════════════════════════════════════════════════════════════════
//  FONT RESOLVER — maps PDF font names → accurate CSS font stack
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Full mapping from PDF font name fragments → CSS font-family stack.
 * Priority: exact match first, then partial match on cleaned name.
 */
const FONT_MAP = [
  // ── Monospace ──────────────────────────────────────────────────────────
  { keys: ['couriernew', 'courier', 'courier-new'],    css: '"Courier New", Courier, monospace',    category: 'mono'  },
  { keys: ['consolasconsolas', 'consolas'],             css: 'Consolas, "Courier New", monospace',   category: 'mono'  },
  { keys: ['lucidaconsole', 'lucida console'],          css: '"Lucida Console", Monaco, monospace',  category: 'mono'  },
  { keys: ['monaco'],                                   css: 'Monaco, "Courier New", monospace',     category: 'mono'  },
  { keys: ['sourcecodepro', 'source code pro'],         css: '"Source Code Pro", monospace',         category: 'mono'  },

  // ── Serif ──────────────────────────────────────────────────────────────
  { keys: ['timesnewroman', 'timesnewromanps', 'timesnewromanpsmt', 'times new roman', 'times'], css: '"Times New Roman", "Times", Georgia, serif', category: 'serif' },
  { keys: ['garamond', 'cormorant', 'ebgaramond'],      css: '"EB Garamond", Garamond, Georgia, serif', category: 'serif' },
  { keys: ['georgia'],                                  css: 'Georgia, "Times New Roman", serif',    category: 'serif' },
  { keys: ['palatino', 'palatinolt', 'palatinolinotype'], css: '"Palatino Linotype", Palatino, Georgia, serif', category: 'serif' },
  { keys: ['bookman'],                                  css: '"Bookman Old Style", Georgia, serif',  category: 'serif' },
  { keys: ['bookantiqua', 'book antiqua'],              css: '"Book Antiqua", Palatino, Georgia, serif', category: 'serif' },
  { keys: ['cambria'],                                  css: '"Cambria", Georgia, serif',             category: 'serif' },
  { keys: ['constantia'],                               css: '"Constantia", Georgia, serif',          category: 'serif' },
  { keys: ['centuryschoolbook', 'century schoolbook'],  css: '"Century Schoolbook", Georgia, serif', category: 'serif' },
  { keys: ['minion', 'minionpro'],                      css: '"Minion Pro", Georgia, serif',          category: 'serif' },

  // ── Sans-Serif ─────────────────────────────────────────────────────────
  { keys: ['arial', 'arialmt', 'arial mt'],             css: 'Arial, "Helvetica Neue", sans-serif',  category: 'sans'  },
  { keys: ['arialnarro', 'arial narrow', 'arialnarrow'], css: '"Arial Narrow", Arial, sans-serif',   category: 'sans'  },
  { keys: ['helvetica', 'helveticaneue', 'helvetica neue'], css: '"Helvetica Neue", Helvetica, Arial, sans-serif', category: 'sans' },
  { keys: ['calibri'],                                  css: 'Calibri, "Segoe UI", Arial, sans-serif', category: 'sans' },
  { keys: ['segoeui', 'segoe ui', 'segoe'],             css: '"Segoe UI", Arial, sans-serif',        category: 'sans'  },
  { keys: ['tahoma'],                                   css: 'Tahoma, Arial, sans-serif',             category: 'sans'  },
  { keys: ['verdana'],                                  css: 'Verdana, Arial, sans-serif',            category: 'sans'  },
  { keys: ['trebuchet', 'trebuchetms', 'trebuchet ms'], css: '"Trebuchet MS", Arial, sans-serif',    category: 'sans'  },
  { keys: ['gill', 'gillsans', 'gill sans'],            css: '"Gill Sans", "Gill Sans MT", Arial, sans-serif', category: 'sans' },
  { keys: ['futura'],                                   css: 'Futura, Arial, sans-serif',             category: 'sans'  },
  { keys: ['centurygothic', 'century gothic'],          css: '"Century Gothic", Futura, Arial, sans-serif', category: 'sans' },
  { keys: ['franklin', 'franklingothic', 'franklin gothic'], css: '"Franklin Gothic", Arial, sans-serif', category: 'sans' },
  { keys: ['myriad', 'myriadpro'],                      css: '"Myriad Pro", Arial, sans-serif',      category: 'sans'  },
  { keys: ['opensans', 'open sans'],                    css: '"Open Sans", Arial, sans-serif',       category: 'sans'  },
  { keys: ['lato'],                                     css: 'Lato, Arial, sans-serif',              category: 'sans'  },
  { keys: ['roboto'],                                   css: 'Roboto, Arial, sans-serif',            category: 'sans'  },
  { keys: ['nunito'],                                   css: 'Nunito, Arial, sans-serif',            category: 'sans'  },
  { keys: ['inter'],                                    css: 'Inter, Arial, sans-serif',             category: 'sans'  },

  // ── Decorative / Display ───────────────────────────────────────────────
  { keys: ['impact'],                                   css: 'Impact, "Arial Narrow", sans-serif',   category: 'sans'  },
  { keys: ['rockwell'],                                 css: 'Rockwell, Georgia, serif',             category: 'serif' },
  { keys: ['stencil'],                                  css: 'Stencil, Impact, sans-serif',          category: 'sans'  },
];

/**
 * Clean and normalize a PDF font name for matching.
 * Input:  "ABCDEF+TimesNewRomanPS-BoldItalicMT"  → "timesnewromanps"
 * Input:  "Helvetica-Bold"                         → "helvetica"
 */
function normalizeFontName(raw) {
  let cleaned = raw || '';
  // Remove subset prefix XXXXXX+
  if (cleaned.includes('+')) cleaned = cleaned.split('+')[1];
  // Strip weight/style suffixes (case-insensitive)
  cleaned = cleaned
    .replace(/[-,]?(Bold|Italic|Oblique|Regular|Roman|MT|PS|LT|Narrow|Light|Thin|Heavy|Black|Medium|Semi|Demi|Extra|Ultra|Condensed|Expanded)/gi, '')
    .replace(/[^a-zA-Z0-9]/g, '')   // remove special chars
    .toLowerCase()
    .trim();
  return cleaned;
}

/**
 * Main font resolver. Returns { fontFamily, fontWeight, fontStyle, isMonospace }
 */
export function resolveFont(block) {
  const name      = block.font_name || '';
  const fontWeight = block.font_weight || (block.bold ? 700 : 400);
  const fontStyle  = block.italic ? 'italic' : 'normal';
  const normalized = normalizeFontName(name);

  // Try to find a match in the map
  for (const entry of FONT_MAP) {
    if (entry.keys.some(k => normalized === k || normalized.includes(k) || k.includes(normalized))) {
      return {
        fontFamily:  entry.css,
        fontWeight,
        fontStyle,
        isMonospace: entry.category === 'mono',
        category:    entry.category,
      };
    }
  }

  // Fallback based on flags from backend
  if (block.is_mono) return { fontFamily: '"Courier New", Courier, monospace', fontWeight, fontStyle, isMonospace: true, category: 'mono' };
  if (block.is_serif) return { fontFamily: '"Times New Roman", Georgia, serif', fontWeight, fontStyle, isMonospace: false, category: 'serif' };

  // Default sans-serif
  return { fontFamily: '"Helvetica Neue", Arial, sans-serif', fontWeight, fontStyle, isMonospace: false, category: 'sans' };
}

// ═══════════════════════════════════════════════════════════════════════════
//  TextBlock component
// ═══════════════════════════════════════════════════════════════════════════
const TextBlock = ({ block, isNew, isSelected, onSelect, onChange, onDelete, originalText }) => {
  const [editing, setEditing] = useState(isNew);
  const textareaRef = useRef(null);

  const font = resolveFont(block);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      // Focus and select all text immediately
      ta.focus();
      // Small delay helps cross-browser reliability for .select()
      setTimeout(() => {
        if (ta) ta.select();
      }, 50);
    }
  }, [editing]);

  const handleDoubleClick = (e) => { e.stopPropagation(); setEditing(true); onSelect(block.id); };
  const handleBlur       = () => setEditing(false);
  const handleKeyDown    = (e) => {
    if (e.key === 'Escape') setEditing(false);
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditing(false); }
    e.stopPropagation();
  };

  const deleted    = !!block.deleted;
  const isModified = block.text !== (originalText ?? block.text);
  const showText   = isNew || deleted || isModified;

  // Shared style that EXACTLY matches PDF font rendering
  const sharedStyle = {
    fontSize:      block.font_size_px,
    lineHeight:    1.15,
    fontFamily:    font.fontFamily,
    fontWeight:    font.fontWeight,
    fontStyle:     font.fontStyle,
    color:         deleted ? '#dc2626' : (block.color || '#000000'),
    letterSpacing: block.char_spacing ? `${block.char_spacing}px` : 'normal',
    whiteSpace:    'nowrap',
    margin: 0, padding: 0,
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
      onDoubleClick={handleDoubleClick}

      style={{
        position:   'absolute',
        left:       block.px_x,
        top:        block.px_y,
        width:      Math.max(block.px_w + 4, 30),
        height:     Math.max(block.px_h + 2, block.font_size_px || 14),
        zIndex:     isSelected ? 30 : (showText ? 20 : 10),
        cursor:     deleted ? 'default' : 'text',
        background: deleted
          ? 'rgba(255,255,255,0.97)'
          : (showText || isSelected) ? 'rgba(255,255,255,0.97)' : 'transparent',
        outline:    isSelected
          ? '2px solid #3b82f6'
          : (showText && !deleted) ? '1px solid rgba(59,130,246,0.25)' : 'none',
        borderRadius:  1,
        boxSizing:     'border-box',
        display:       'flex',
        alignItems:    'flex-start',
        overflow:      'visible',
      }}
    >
      {/* ── Editing: textarea with exact font match ── */}
      {editing && !deleted ? (
        <textarea
          ref={textareaRef}
          value={block.text}
          onChange={(e) => onChange(block.id, e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          style={{
            position:   'absolute',
            top: 0, left: 0,
            width:   Math.max(block.px_w + 60, 80),
            minHeight: block.px_h + 4,
            ...sharedStyle,
            color:      block.color || '#000000',
            background: '#fff',
            border:     '2px solid #3b82f6',
            borderRadius: 3,
            outline:    'none',
            resize:     'both',
            padding:    '1px 2px',
            boxShadow:  '0 4px 24px rgba(59,130,246,0.25)',
            zIndex:     50,
          }}
        />
      ) : (
        /* ── Display: show new text with exact matching font ── */
        showText && (
          <span
            style={{
              ...sharedStyle,
              display:        'block',
              textDecoration: deleted ? 'line-through' : 'none',
              pointerEvents:  'none',
              userSelect:     'none',
              paddingLeft:    1,
              overflow:       'visible',
            }}
          >
            {deleted ? (originalText || block.text) : block.text}
          </span>
        )
      )}

      {/* ── Action tooltip on select ── */}
      {isSelected && (
        <div style={{ position: 'absolute', top: -26, right: 0, display: 'flex', gap: 3, zIndex: 60 }}>
          {/* Font info badge */}
          <span style={{
            background: '#1e293b', color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: 4, padding: '2px 6px',
            fontSize: 10, whiteSpace: 'nowrap',
          }}>
            {block.font_name?.split('-')[0] || 'Font'} · {Math.round(block.font_size_pt)}pt
          </span>
          {!deleted && !editing && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); setEditing(true); }}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              ✏ Edit
            </button>
          )}
          <button
            onMouseDown={(e) => { e.stopPropagation(); onDelete(block.id); }}
            style={{ background: deleted ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            {deleted ? '↩ Restore' : '🗑 Remove'}
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  PageEditor
// ═══════════════════════════════════════════════════════════════════════════
const PageEditor = ({ pageData, edits, selectedId, tool, onSelect, onChange, onDelete, onAddText }) => {
  const handleClick = useCallback((e) => {
    if (tool !== 'add-text') { onSelect(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const rs = pageData.render_scale;
    onAddText(pageData.page_num, px, py, px / rs, py / rs);
  }, [tool, pageData, onAddText, onSelect]);

  const mergedBlocks = pageData.blocks.map(b => {
    const edit = edits.find(e => e.id === b.id);
    return edit ? { ...b, ...edit } : b;
  });
  const newBlocks = edits.filter(e => e.is_new && e.page === pageData.page_num && !e.deleted);

  return (
    <div
      style={{
        position: 'relative',
        width: pageData.img_w,
        maxWidth: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        cursor: tool === 'add-text' ? 'crosshair' : 'default',
        userSelect: 'none',
        flexShrink: 0,
        background: '#fff',
        marginBottom: 8,
      }}
      onClick={handleClick}
    >
      <img
        src={`data:image/png;base64,${pageData.img_b64}`}
        style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }}
        alt={`Page ${pageData.page_num + 1}`}
        draggable={false}
      />

      {mergedBlocks.map(block => (
        <TextBlock
          key={block.id}
          block={block}
          isNew={false}
          isSelected={selectedId === block.id}
          onSelect={onSelect}
          onChange={onChange}
          onDelete={onDelete}
          originalText={pageData.blocks.find(b => b.id === block.id)?.text}
        />
      ))}

      {newBlocks.map(block => (
        <TextBlock
          key={block.id}
          block={block}
          isNew={true}
          isSelected={selectedId === block.id}
          onSelect={onSelect}
          onChange={onChange}
          onDelete={onDelete}
          originalText={null}
        />
      ))}

      {pageData.is_scanned && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(234,179,8,0.92)', color: '#000', padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Scan size={12} /> OCR
        </div>
      )}
      <div style={{ position: 'absolute', bottom: -28, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#6b7280', pointerEvents: 'none' }}>
        Page {pageData.page_num + 1}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  Main View
// ═══════════════════════════════════════════════════════════════════════════
export default function EditPDFView({ onBack }) {
  const [file,        setFile]       = useState(null);
  const [fileId,      setFileId]     = useState(null);
  const [pages,       setPages]      = useState([]);
  const [edits,       setEdits]      = useState([]);
  const [selectedId,  setSelectedId] = useState(null);
  const [tool,        setTool]       = useState('select');
  const [isLoading,   setIsLoading]  = useState(false);
  const [isExporting, setIsExporting]= useState(false);
  const [error,       setError]      = useState(null);
  const [success,     setSuccess]    = useState(false);
  const fileInputRef = useRef(null);

  // ── Load ──────────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setEdits([]); setSelectedId(null);
    setError(null); setSuccess(false); setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await axios.post(`${API_BASE}/extract-page-data`, fd);
      setFileId(res.data.file_id);
      setPages(res.data.pages);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setIsLoading(false); }
  };

  const handleChange = useCallback((id, text) => {
    setEdits(prev => {
      const ex = prev.find(e => e.id === id);
      if (ex) return prev.map(e => e.id === id ? { ...e, text } : e);
      return [...prev, { id, text }];
    });
  }, []);

  const handleDelete = useCallback((id) => {
    setEdits(prev => {
      const ex = prev.find(e => e.id === id);
      if (ex?.is_new)  return prev.filter(e => e.id !== id);
      if (ex?.deleted) return prev.map(e => e.id === id ? { ...e, deleted: false } : e);
      if (ex)          return prev.map(e => e.id === id ? { ...e, deleted: true } : e);
      return [...prev, { id, deleted: true }];
    });
    setSelectedId(null);
  }, []);

  const handleAddText = useCallback((pageNum, px_x, px_y, pdf_x, pdf_y) => {
    const id = `new_${Date.now()}`;
    setEdits(prev => [...prev, {
      id, page: pageNum,
      text: 'New text',
      px_x, px_y, px_w: 160, px_h: 24,
      pdf_x, pdf_y, pdf_w: 110, pdf_h: 16,
      font_size_px: 20, font_size_pt: 13,
      color: '#000000', font_weight: 400,
      bold: false, italic: false, is_mono: false, is_serif: false,
      font_name: 'Helvetica', char_spacing: 0,
      is_new: true,
    }]);
    setSelectedId(id);
    setTool('select');
  }, []);

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!fileId) return;
    setIsExporting(true); setError(null); setSuccess(false);
    try {
      const payload = [];
      edits.filter(e => !e.is_new).forEach(edit => {
        let orig = null;
        for (const pg of pages) { orig = pg.blocks.find(b => b.id === edit.id); if (orig) break; }
        if (!orig) return;
        payload.push({
          page:         orig.page,
          pdf_x:        orig.pdf_x,       pdf_y:     orig.pdf_y,
          pdf_w:        orig.pdf_w,       pdf_h:     orig.pdf_h,
          text:         edit.text ?? orig.text,
          font_size_pt: orig.font_size_pt,
          color:        orig.color,
          // ── Font metadata for exact PDF reconstruction ──
          font_name:    orig.font_name    || 'Helvetica',
          bold:         orig.bold         || false,
          italic:       orig.italic       || false,
          is_mono:      orig.is_mono      || false,
          is_serif:     orig.is_serif     || false,
          deleted:      !!edit.deleted,
          is_new:       false,
        });
      });
      edits.filter(e => e.is_new && !e.deleted).forEach(edit => {
        payload.push({
          page:         edit.page,
          pdf_x:        edit.pdf_x,       pdf_y:     edit.pdf_y,
          pdf_w:        edit.pdf_w,       pdf_h:     edit.pdf_h,
          text:         edit.text,
          font_size_pt: edit.font_size_pt || 12,
          color:        edit.color        || '#000000',
          font_name:    edit.font_name    || 'Helvetica',
          bold:         edit.bold         || false,
          italic:       edit.italic       || false,
          is_mono:      edit.is_mono      || false,
          is_serif:     edit.is_serif     || false,
          deleted:      false,
          is_new:       true,
        });
      });

      if (!payload.length) { setError('No changes to save.'); setIsExporting(false); return; }

      const res = await axios.post(`${API_BASE}/apply-edits`, { file_id: fileId, edits: payload }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `edited_${file?.name || 'document.pdf'}`;
      document.body.appendChild(a); a.click(); a.remove();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const blob = err.response?.data;
      if (blob instanceof Blob) {
        const t = await blob.text();
        try { setError(JSON.parse(t).error); } catch { setError(t.slice(0, 200)); }
      } else setError(err.response?.data?.error || err.message);
    } finally { setIsExporting(false); }
  };

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      const inInput = e.target.matches('textarea,input');
      if (e.key === 'Escape') { setSelectedId(null); setTool('select'); }
      if (e.key === 'Delete' && selectedId && !inInput) handleDelete(selectedId);
      if (!inInput && (e.key === 't' || e.key === 'T')) setTool('add-text');
      if (!inInput && (e.key === 'v' || e.key === 'V')) setTool('select');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedId, handleDelete]);

  const changeCount = edits.length;

  // ══════════════════════════════════════════ UPLOAD SCREEN
  if (!file || (pages.length === 0 && !isLoading)) {
    return (
      <div className="animate-[fadeIn_0.4s_ease-out] flex flex-col h-full">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 group bg-gray-800 border border-gray-700 py-2 px-4 rounded-lg hover:border-gray-500 w-fit transition-all">
          <ArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div onClick={() => fileInputRef.current?.click()} className="max-w-xl w-full border-2 border-dashed border-gray-700 rounded-3xl p-16 hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer text-center group">
            <UploadSimple size={72} className="text-gray-600 group-hover:text-blue-500 mx-auto mb-6 transition-all group-hover:scale-110" />
            <h2 className="text-2xl font-bold text-white mb-3">PDF Direct Editor</h2>
            <p className="text-gray-500 mb-2">Double-click any text to edit it in place — font style matched automatically.</p>
            <p className="text-gray-600 text-xs mt-4">Detects font family · weight · size · color · spacing</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
          </div>
        </div>
        {error && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-2xl"><WarningCircle size={18} />{error}</div>}
      </div>
    );
  }

  // ══════════════════════════════════════════ LOADING
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">Analyzing Fonts & Layout</p>
          <p className="text-gray-500 text-sm mt-1">Extracting font names, sizes, colors, and positions...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════ EDITOR
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900">

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-800 border-b border-gray-700">
        <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"><ArrowLeft size={17} /></button>
        <div className="h-5 w-px bg-gray-700 mx-1" />
        <span className="text-white text-sm font-semibold truncate max-w-[180px]">{file?.name}</span>
        <div className="h-5 w-px bg-gray-700 mx-1" />

        <div className="flex items-center gap-0.5 bg-gray-900 p-1 rounded-xl border border-gray-700">
          <button onClick={() => setTool('select')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tool === 'select' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`} title="Select (V)">
            <Cursor size={13} weight="bold" /> Select
          </button>
          <button onClick={() => setTool('add-text')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tool === 'add-text' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`} title="Add Text (T)">
            <TextT size={13} weight="bold" /> Add Text
          </button>
        </div>

        <span className="text-gray-600 text-xs hidden lg:block ml-2">DblClick=Edit · Del=Remove · T=Add</span>
        <div className="flex-1" />
        {changeCount > 0 && <span className="text-yellow-400 text-xs font-bold mr-1">{changeCount} change{changeCount !== 1 ? 's' : ''}</span>}

        <button
          onClick={handleExport}
          disabled={isExporting || changeCount === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg"
        >
          {isExporting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <DownloadSimple size={14} weight="bold" />}
          {isExporting ? 'Saving...' : 'Save PDF'}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnails */}
        <div className="w-24 shrink-0 bg-gray-900 border-r border-gray-700 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-3 items-center">
          {pages.map((pg, i) => (
            <button key={i} onClick={() => document.getElementById(`page-${i}`)?.scrollIntoView({ behavior: 'smooth' })} className="w-16 overflow-hidden rounded border-2 border-gray-700 hover:border-blue-500 transition-colors">
              <img src={`data:image/png;base64,${pg.img_b64}`} alt="" className="w-full pointer-events-none" />
              <div className="text-center text-[10px] text-gray-500 py-0.5">{i + 1}</div>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-950 custom-scrollbar scroll-smooth" onClick={() => setSelectedId(null)}>
          <div className="min-h-full w-full py-12 px-8 flex flex-col items-center gap-14">
            {pages.map((pg, i) => (
              <div 
                key={i} 
                id={`page-${i}`} 
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <PageEditor 
                  pageData={pg} 
                  edits={edits} 
                  selectedId={selectedId} 
                  tool={tool} 
                  onSelect={setSelectedId} 
                  onChange={handleChange} 
                  onDelete={handleDelete} 
                  onAddText={handleAddText} 
                />
              </div>
            ))}
            <div className="h-20" />
          </div>
        </div>

        {/* Info panel */}
        <div className="w-44 shrink-0 bg-gray-900 border-l border-gray-700 p-4 hidden xl:flex flex-col gap-5 text-xs text-gray-500">
          <div>
            <p className="font-black text-gray-400 uppercase tracking-wider text-[10px] mb-3">Controls</p>
            {[['DblClick','Edit text'],['Enter','Confirm'],['Esc','Cancel'],['Del','Remove'],['T','Add text'],['V','Select']].map(([k,v]) => (
              <p key={k} className="mt-1.5 flex items-start gap-1.5">
                <kbd className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[10px] shrink-0">{k}</kbd>
                <span>{v}</span>
              </p>
            ))}
          </div>
          <div>
            <p className="font-black text-gray-400 uppercase tracking-wider text-[10px] mb-2">Status</p>
            <p className={changeCount > 0 ? 'text-yellow-400 font-bold' : 'text-gray-600'}>
              {changeCount > 0 ? `${changeCount} pending` : 'No changes'}
            </p>
            {pages.some(p => p.is_scanned) && <p className="mt-2 text-yellow-500 flex items-center gap-1"><Scan size={10} /> OCR used</p>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(error || success) && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className={`${success ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl text-sm`}>
              {success ? <CheckCircle size={18} weight="bold" /> : <WarningCircle size={18} weight="bold" />}
              <span className="font-medium">{success ? 'PDF saved & downloaded!' : error}</span>
              <button onClick={() => { setError(null); setSuccess(false); }} className="ml-2 opacity-60 hover:opacity-100 text-lg">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

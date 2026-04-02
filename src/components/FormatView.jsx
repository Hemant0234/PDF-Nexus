import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { ArrowLeft, AppWindow, UploadSimple, CheckCircle, WarningCircle, ArrowCounterClockwise, FilePdf, Image } from '@phosphor-icons/react';

const FormatView = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState('jpg');
  const [totalPages, setTotalPages] = useState(null);

  // Page selection state (only relevant when PDF → image)
  const [pageMode, setPageMode] = useState('all');   // 'all' | 'single' | 'range'
  const [pageSingle, setPageSingle] = useState(1);
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(1);

  const [isCountingPages, setIsCountingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [downloadName, setDownloadName] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const isPdfInput = file && file.name.toLowerCase().endsWith('.pdf');
  const isImageInput = file && /\.(png|jpe?g)$/i.test(file.name);
  const needsPageSelection = isPdfInput && ['jpg','jpeg','png'].includes(targetFormat);

  // Set sensible default format when file type changes
  useEffect(() => {
    if (isPdfInput) setTargetFormat('jpg');
    else if (isImageInput) setTargetFormat('pdf');
    setPageMode('all');
    setPageSingle(1);
    setPageFrom(1);
    setPageTo(1);
    setTotalPages(null);
  }, [file]);

  // When switching to image output from PDF, fetch page count
  useEffect(() => {
    if (!needsPageSelection || !file) { setTotalPages(null); return; }
    const fetchCount = async () => {
      setIsCountingPages(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API_BASE}/pdf-page-count`, fd);
        const count = res.data.total_pages;
        setTotalPages(count);
        setPageTo(count);
      } catch { setTotalPages(null); }
      finally { setIsCountingPages(false); }
    };
    fetchCount();
  }, [needsPageSelection, file]);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsDone(false);
    setError(null);
  };

  const handleProcess = async () => {
    if (!file) { setError("Please upload a file."); return; }
    setIsProcessing(true);
    setError(null);
    setIsDone(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', targetFormat);

    if (needsPageSelection) {
      formData.append('page_mode', pageMode);
      formData.append('page_single', String(pageSingle));
      formData.append('page_from', String(pageFrom));
      formData.append('page_to', String(pageTo));
    }

    try {
      const response = await axios.post(`${API_BASE}/convert-format`, formData, { responseType: 'blob' });

      // Detect filename from content-disposition header if available
      const disposition = response.headers['content-disposition'];
      let filename = `converted.${targetFormat}`;
      if (needsPageSelection && pageMode !== 'single') filename = 'converted_pages.zip';
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      setDownloadName(filename);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setIsDone(true);
    } catch (err) {
      let msg = "Conversion failed.";
      if (err.response?.data instanceof Blob) {
        try { const t = await err.response.data.text(); msg = JSON.parse(t).error || msg; } catch {}
      } else if (err.response?.data?.error) { msg = err.response.data.error; }
      setError(msg);
    } finally { setIsProcessing(false); }
  };

  const FormatBtn = ({ type, disabled }) => {
    const active = targetFormat === type.toLowerCase();
    return (
      <button
        onClick={() => !disabled && setTargetFormat(type.toLowerCase())}
        disabled={disabled}
        className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
          disabled ? 'opacity-30 cursor-not-allowed border-gray-700 text-gray-600' :
          active
            ? 'bg-brand-600/20 border-brand-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.2)]'
            : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white hover:bg-gray-700'
        }`}
      >
        {type}
      </button>
    );
  };

  const inputNum = (val, setter, min, max) => (
    <input
      type="number"
      value={val}
      min={min}
      max={max}
      onChange={e => setter(Math.max(min, Math.min(max, Number(e.target.value))))}
      className="w-20 bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 text-center"
    />
  );

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group bg-gray-800 border border-gray-700 py-2 px-4 rounded-lg hover:border-gray-500 w-fit">
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />

          <div className="text-center mb-8">
            <AppWindow className="text-5xl text-brand-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Universal Format Converter</h2>
            <p className="text-gray-400">Convert PDF pages into images, or wrap images into PDFs.</p>
          </div>

          {/* File Upload */}
          {!file ? (
            <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-brand-500 hover:bg-gray-700/30 transition-all cursor-pointer group text-center mb-6">
              <UploadSimple size={48} className="text-gray-500 group-hover:text-brand-400 mx-auto mb-4 transition-colors" />
              <h3 className="text-lg font-medium text-white">Upload PDF or Image</h3>
              <p className="text-gray-500 text-sm mt-1">.pdf, .png, .jpg, .jpeg</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileSelect} />
            </div>
          ) : (
            <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-700 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {isPdfInput ? <FilePdf size={28} className="text-red-400 shrink-0" /> : <Image size={28} className="text-blue-400 shrink-0" />}
                <span className="font-medium text-white truncate max-w-xs">{file.name}</span>
                {totalPages && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{totalPages} pages</span>}
              </div>
              <button onClick={() => { setFile(null); setTotalPages(null); }} className="text-gray-500 hover:text-red-400 p-2 transition-colors">
                <ArrowCounterClockwise size={20} />
              </button>
            </div>
          )}

          {/* Format Selector */}
          {file && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Convert <span className="text-brand-400">{file.name.split('.').pop()?.toUpperCase()}</span> to:
              </label>
              <div className="flex gap-3">
                {isPdfInput && <>
                  <FormatBtn type="JPG" />
                  <FormatBtn type="PNG" />
                  <FormatBtn type="PDF" disabled />
                </>}
                {isImageInput && <>
                  <FormatBtn type="PDF" />
                  <FormatBtn type="JPG" disabled />
                  <FormatBtn type="PNG" disabled />
                </>}
              </div>
            </div>
          )}

          {/* ── Page Selection (PDF → Image only) ────────────────────────── */}
          {needsPageSelection && (
            <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                📄 Which pages to convert?
                {isCountingPages && <span className="text-xs text-gray-500 animate-pulse">Counting pages...</span>}
                {totalPages && !isCountingPages && <span className="text-xs text-gray-500">({totalPages} total)</span>}
              </p>

              <div className="flex flex-col gap-3">
                {/* All pages */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" name="pgMode" value="all" checked={pageMode === 'all'}
                    onChange={() => setPageMode('all')}
                    className="accent-brand-500 w-4 h-4" />
                  <span className="text-white text-sm font-medium">All pages</span>
                  {totalPages && pageMode === 'all' && (
                    <span className="text-xs text-gray-500">→ downloads as .zip ({totalPages} images)</span>
                  )}
                </label>

                {/* Single page */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="pgMode" value="single" checked={pageMode === 'single'}
                    onChange={() => setPageMode('single')}
                    className="accent-brand-500 w-4 h-4" />
                  <span className="text-white text-sm font-medium">Single page</span>
                  {pageMode === 'single' && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-gray-400 text-xs">Page:</span>
                      {inputNum(pageSingle, setPageSingle, 1, totalPages || 9999)}
                      {totalPages && <span className="text-xs text-gray-500">of {totalPages}</span>}
                    </div>
                  )}
                </label>

                {/* Page range */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="pgMode" value="range" checked={pageMode === 'range'}
                    onChange={() => setPageMode('range')}
                    className="accent-brand-500 w-4 h-4" />
                  <span className="text-white text-sm font-medium">Page range</span>
                  {pageMode === 'range' && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-gray-400 text-xs">From</span>
                      {inputNum(pageFrom, setPageFrom, 1, pageTo)}
                      <span className="text-gray-400 text-xs">to</span>
                      {inputNum(pageTo, setPageTo, pageFrom, totalPages || 9999)}
                      {totalPages && (
                        <span className="text-xs text-gray-500">
                          → {pageTo - pageFrom + 1} images as .zip
                        </span>
                      )}
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-4 text-left">
              <WarningCircle size={22} weight="fill" /> <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success */}
          {isDone && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 mb-4 text-left">
              <CheckCircle size={22} weight="fill" />
              <span className="text-sm">
                Converted! <strong>{downloadName}</strong> downloaded.
                {downloadName.endsWith('.zip') && ' (Extract the ZIP to see all images)'}
              </span>
            </div>
          )}

          {/* Convert Button */}
          <button
            onClick={handleProcess}
            disabled={!file || isProcessing || isCountingPages}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
          >
            {isProcessing ? (
              <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Converting...</>
            ) : isCountingPages ? (
              <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Reading PDF...</>
            ) : (
              <>Start Conversion <AppWindow weight="bold" size={20} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormatView;

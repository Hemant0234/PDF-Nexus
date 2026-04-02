import React, { useState, useRef } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { ArrowLeft, Image as ImageIcon, UploadSimple, CheckCircle, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react';

const ResizeImageView = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(800);
  const [originalWidth, setOriginalWidth] = useState(800);
  const [originalHeight, setOriginalHeight] = useState(800);
  const [targetSizeKb, setTargetSizeKb] = useState('');
  
  const [enableResize, setEnableResize] = useState(false);
  const [enableCompress, setEnableCompress] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      // Reset dimensions to natural image size using HTML Image element
      const img = new Image();
      img.onload = () => {
          setWidth(img.width);
          setHeight(img.height);
          setOriginalWidth(img.width);
          setOriginalHeight(img.height);
      };
      img.src = URL.createObjectURL(selected);
      
      setIsDone(false);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError("Please upload an image file first.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setIsDone(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('width', enableResize ? width : originalWidth);
    formData.append('height', enableResize ? height : originalHeight);
    if (enableCompress && targetSizeKb) formData.append('target_size_kb', targetSizeKb);

    try {
      const response = await axios.post(`${API_BASE}/resize-image`, formData, {
        responseType: 'blob', // Important for downloading
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Construct download
      const ext = file.name.split('.').pop() || 'jpg';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resized_${width}x${height}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setIsDone(true);
    } catch (err) {
      console.error(err);
      let errorMessage = "An error occurred during resizing.";
      if (err.response && err.response.data && err.response.data instanceof Blob) {
         try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            errorMessage = json.error || errorMessage;
         } catch(e){}
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group bg-gray-800 border border-gray-700 py-2 px-4 rounded-lg hover:border-gray-500 w-fit">
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500"></div>
            
            <ImageIcon className="text-5xl text-pink-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Resize Image Dimensions</h2>
            <p className="text-gray-400 mb-8">Change the pixel dimensions and compress any image seamlessly.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                {/* Left: File Upload & Preview */}
                <div>
                   {!file ? (
                        <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-pink-500 hover:bg-gray-700/30 transition-all cursor-pointer group h-full flex flex-col justify-center">
                           <UploadSimple size={48} className="text-gray-500 group-hover:text-pink-400 mx-auto mb-4 transition-colors" />
                           <h3 className="text-lg font-medium text-white">Upload JPG or PNG</h3>
                           <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={handleFileSelect} />
                        </div>
                    ) : (
                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 text-left h-full flex flex-col items-center">
                           <img src={previewUrl} alt="Preview" className="max-w-full max-h-48 object-contain rounded-lg shadow-md mb-4" />
                           <div className="flex items-center justify-between w-full">
                             <div className="truncate flex-1 font-medium text-gray-400 text-sm">{file.name}</div>
                             <button onClick={() => {setFile(null); setPreviewUrl(null)}} className="text-gray-500 hover:text-red-400 p-2"><ArrowCounterClockwise size={18} /></button>
                           </div>
                        </div>
                    )}
                </div>

                {/* Right: Settings */}
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 text-left flex flex-col justify-center">
                    <div className="space-y-4">
                      
                      {/* Dimensions Toggle Block */}
                      <div className={`p-4 rounded-xl border ${enableResize ? 'border-pink-500/50 bg-pink-500/5 shadow-[0_0_15px_rgba(236,72,153,0.1)]' : 'border-gray-700 bg-gray-800/50'} transition-all`}>
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <input type="checkbox" checked={enableResize} onChange={(e) => setEnableResize(e.target.checked)} disabled={!file} className="w-5 h-5 rounded accent-pink-500 bg-gray-700 border-gray-600 focus:ring-0 cursor-pointer disabled:opacity-50" />
                            <span className="text-sm font-bold text-gray-200">Change Dimensions (Resolution)</span>
                        </label>
                        <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${enableResize ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Width (px)</label>
                            <input type="number" min="1" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-pink-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Height (px)</label>
                            <input type="number" min="1" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:border-pink-500 focus:outline-none" />
                          </div>
                        </div>
                      </div>

                      {/* Compression Toggle Block */}
                      <div className={`p-4 rounded-xl border ${enableCompress ? 'border-pink-500/50 bg-pink-500/5 shadow-[0_0_15px_rgba(236,72,153,0.1)]' : 'border-gray-700 bg-gray-800/50'} transition-all`}>
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <input type="checkbox" checked={enableCompress} onChange={(e) => setEnableCompress(e.target.checked)} disabled={!file} className="w-5 h-5 rounded accent-pink-500 bg-gray-700 border-gray-600 focus:ring-0 cursor-pointer disabled:opacity-50" />
                            <span className="text-sm font-bold text-gray-200">Compress File Size</span>
                        </label>
                        <div className={`transition-all duration-300 ${enableCompress ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Max Size (KB)</label>
                          <div className="relative">
                            <input type="number" min="10" placeholder="e.g. 500" value={targetSizeKb} onChange={(e) => setTargetSizeKb(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 pr-10 text-white focus:border-pink-500 focus:outline-none" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">KB</span>
                          </div>
                          <p className="text-xs text-brand-400 mt-2 leading-tight">If specified, the tool will crunch the image algorithmically to tightly fit under this limit.</p>
                        </div>
                      </div>

                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-3 mt-4 text-xs font-semibold">
                            <WarningCircle size={20} weight="fill" className="shrink-0" /> <span>{error}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Message */}
            {isDone && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 mb-6 text-left">
                    <CheckCircle size={24} weight="fill" /> <span>Image Resized! Download should have started.</span>
                </div>
            )}

            {/* Action */}
            <button 
                onClick={handleProcess}
                disabled={!file || isProcessing}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)]"
            >
                {isProcessing ? (
                   <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Regenerating Image...</>
                ) : (
                   <>Resize Image <ImageIcon weight="bold" size={20} /></>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResizeImageView;


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { ArrowLeft, Eye, MagnifyingGlassMinus, MagnifyingGlassPlus, FilePdf, CheckCircle, Sliders, RocketLaunch, DownloadSimple, ShareNetwork, ArrowCounterClockwise, Image as ImageIcon, WarningCircle } from '@phosphor-icons/react';

const ProcessingView = ({ file, onBack }) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState(null);
  
  // Backend response attributes
  const [uploadedData, setUploadedData] = useState(null);
  
  // Only create preview URL IF exactly needed, but we will always display after success
  const isImage = file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState(null);

  // Automatically start upload when component mounts
  useEffect(() => {
    uploadFile(file);
    // Cleanup preview URL to prevent memory leaks
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [file]); // Only run when file changes

  const uploadFile = async (currentFile) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    setIsDone(false);

    const formData = new FormData();
    formData.append('file', currentFile);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      // Artificial small delay for UX if upload is too fast
      if (progress < 100) {
        setProgress(100);
      }
      
      setTimeout(() => {
          setIsUploading(false);
          setIsDone(true);
          setUploadedData(response.data);
          
          if (isImage) {
            setPreviewUrl(URL.createObjectURL(currentFile));
          }
      }, 500);

    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setProgress(0);
      let errorMessage = "An error occurred during upload.";
      if (err.response && err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
      }
      setError(errorMessage);
    }
  };

  const handleReset = () => {
    onBack(); // Just return to dashboard
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const FormatButton = ({ type }) => {
    const isActive = selectedFormat === type.toLowerCase();
    return (
      <button 
        onClick={() => setSelectedFormat(type.toLowerCase())}
        disabled={isUploading || error}
        className={isActive 
          ? "active bg-brand-600/20 border-brand-500 text-white border-2 rounded-xl py-2.5 px-3 text-sm font-medium transition-all shadow-[0_0_10px_rgba(139,92,246,0.2)]"
          : "bg-gray-700/50 border-gray-600 text-gray-400 border rounded-xl py-2.5 px-3 text-sm font-medium hover:border-gray-500 hover:text-white transition-all hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"}
      >
        {type}
      </button>
    );
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group bg-gray-800 border border-gray-700 py-2 px-4 rounded-lg hover:border-gray-500 w-fit">
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-6 flex flex-col h-[650px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-indigo-500"></div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-medium text-white flex items-center gap-2 tracking-tight">
                <Eye weight="duotone" className="text-brand-400" size={24} /> 
                {isDone ? "File Preview" : "Waiting for upload..."}
              </h3>
              <div className={`flex items-center gap-2 bg-gray-900/50 p-1 rounded-xl border border-gray-700 ${!isDone && 'opacity-50 pointer-events-none'}`}>
                <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                  <MagnifyingGlassMinus size={18} />
                </button>
                <div className="w-px h-5 bg-gray-700"></div>
                <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                  <MagnifyingGlassPlus size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-gray-900/80 rounded-2xl border border-gray-700/50 flex items-center justify-center overflow-auto relative shadow-inner p-8">
              
              {!isDone && !error ? (
                 <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-brand-500 animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Uploading and connecting to secure server...</p>
                 </div>
              ) : error ? (
                 <div className="text-center text-red-400 flex flex-col items-center">
                    <WarningCircle size={48} weight="duotone" className="mb-3 text-red-500" />
                    <p className="font-semibold text-lg">{error}</p>
                    <button onClick={() => uploadFile(file)} className="mt-4 px-4 py-2 bg-gray-800 border-gray-700 border rounded-lg text-white hover:bg-gray-700">Try Again</button>
                 </div>
              ) : isImage && previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl border border-gray-700/50 animate-[fadeIn_0.5s]" />
              ) : (
                <div className="flex flex-col gap-6 items-center w-full animate-[fadeIn_0.5s]">
                  {[1, 2, 3].map((page) => (
                    <div key={page} className="w-full max-w-sm aspect-[1/1.4] bg-white rounded-lg shadow-xl shrink-0 flex flex-col items-center justify-center relative group overflow-hidden border border-gray-300">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-100 opacity-50"></div>
                      <div className="w-3/4 h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="w-5/6 h-2 bg-gray-200 rounded mb-2"></div>
                      <div className="w-full h-2 bg-gray-200 rounded mb-2"></div>
                      <div className="w-4/5 h-2 bg-gray-200 rounded mb-2"></div>
                      <div className="w-full h-2 bg-gray-200 rounded mb-8"></div>
                      <div className="w-2/3 h-32 bg-gray-100 border border-dashed border-gray-300 rounded mb-4 flex items-center justify-center">
                        <ImageIcon weight="duotone" className="text-4xl text-gray-300" size={48} />
                      </div>
                      <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs font-bold py-1 px-2 rounded-md shadow">
                        Page {page}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Settings */}
        <div className="space-y-6">
          <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Selected File</h4>
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${isImage ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-500' : 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/20 text-red-500'}`}>
                {isImage ? <ImageIcon weight="fill" size={32} /> : <FilePdf weight="fill" size={32} />}
              </div>
              <div className="overflow-hidden flex-1 py-1">
                <p className="text-base font-medium text-white truncate">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1">{formatBytes(file.size)}</p>
              </div>
            </div>
            
            <div className={`flex justify-between items-center text-sm p-3 rounded-xl border shadow-inner ${error ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-brand-500/10 text-brand-400 border-brand-500/20'}`}>
              <span className="font-medium flex items-center gap-2">
                {!error && <div className={`w-2 h-2 rounded-full ${isUploading ? 'bg-brand-500 animate-pulse' : 'bg-green-500'}`}></div>}
                {error ? 'Upload Error' : isUploading ? 'Uploading...' : isDone ? 'Successfully Uploaded!' : 'Pending'}
              </span>
              {!error && <CheckCircle weight="fill" size={20} className={isDone ? 'text-green-500' : ''} />}
              {error && <WarningCircle weight="fill" size={20} className="text-red-500" />}
            </div>

            {uploadedData && (
                <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700 text-xs text-gray-400 font-mono break-all animate-[fadeIn_0.5s]">
                    <span className="text-brand-400 font-semibold mb-1 block">API Response:</span>
                    ID: {uploadedData.file_id}<br/>
                    Status: {uploadedData.message}
                </div>
            )}
          </div>

          <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-6 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-6 border-b border-gray-700/50 pb-4 flex items-center gap-2">
              <Sliders weight="duotone" className="text-brand-400" size={22} /> Action Settings
            </h3>
            
            <div className={`space-y-6 ${(!isDone || error) ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Target Format</label>
                <div className="grid grid-cols-3 gap-3">
                  <FormatButton type="PDF" />
                  <FormatButton type="JPG" />
                  <FormatButton type="PNG" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Compression Quality</label>
                <div className="group relative">
                  <input type="range" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500" min="1" max="100" defaultValue="80" disabled={!isDone} />
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-500 mt-2">
                  <span>Minimum</span>
                  <span className="text-brand-400">Recommended</span>
                  <span>Maximum</span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-700/50">
                {isUploading && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-brand-400 font-medium animate-pulse">Uploading to server...</span>
                      <span className="text-white font-medium">{progress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-700/50 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 transition-all duration-300 relative" style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-progress-stripes"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {isDone && (
                  <div className="flex flex-col gap-3 animate-[fadeIn_0.5s_ease-out]">
                    <button className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl py-4 font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] flex items-center justify-center gap-2 group transform hover:-translate-y-1 hover:scale-[1.02]">
                      Process Format <RocketLaunch weight="bold" size={22} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                       <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2 text-sm">
                        <DownloadSimple size={20} className="text-brand-400" /> Save
                      </button>
                      <button onClick={handleReset} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2 text-sm">
                        <ArrowCounterClockwise size={20} className="text-gray-400" /> Start Over
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;


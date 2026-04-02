import React, { useState, useRef } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { ArrowLeft, Intersect, UploadSimple, DownloadSimple, CheckCircle, WarningCircle, X } from '@phosphor-icons/react';

const MergeView = ({ onBack }) => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
      setIsDone(false);
      setError(null);
    }
  };

  const removeFile = (indexToRemove) => {
      setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleProcess = async () => {
    if (files.length < 2) {
      setError("Please add at least two PDF files to merge.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setIsDone(false);

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    try {
      const response = await axios.post(`${API_BASE}/merge`, formData, {
        responseType: 'blob', // Important for downloading
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'merged_document.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setIsDone(true);
    } catch (err) {
      console.error(err);
      let errorMessage = "An error occurred during merging.";
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

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
            
            <Intersect className="text-5xl text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Merge PDF Documents</h2>
            <p className="text-gray-400 mb-8">Combine multiple PDF documents into a single organized file seamlessly.</p>

            {/* File Upload / Selection */}
            <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-orange-500 hover:bg-gray-700/30 transition-all cursor-pointer group mb-6">
                <UploadSimple size={48} className="text-gray-500 group-hover:text-orange-400 mx-auto mb-4 transition-colors" />
                <h3 className="text-lg font-medium text-white">Click to Add PDF Files</h3>
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" multiple onChange={handleFileSelect} />
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
               <div className="space-y-3 mb-8 text-left max-h-64 overflow-y-auto custom-scrollbar">
                  {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-sm animate-[fadeIn_0.3s]">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 shrink-0 bg-orange-500/20 text-orange-500 rounded-lg flex items-center justify-center font-bold text-sm">{i+1}</div>
                              <span className="truncate text-gray-300 font-medium">{file.name}</span>
                          </div>
                          <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-400 p-2"><X size={18} weight="bold" /></button>
                      </div>
                  ))}
               </div>
            )}

            {/* Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6 text-left">
                    <WarningCircle size={24} weight="fill" /> <span>{error}</span>
                </div>
            )}
            
            {isDone && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 mb-6 text-left">
                    <CheckCircle size={24} weight="fill" /> <span>PDFs Merged! Your download should have started.</span>
                </div>
            )}

            {/* Action */}
            <button 
                onClick={handleProcess}
                disabled={files.length < 2 || isProcessing}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] cursor-pointer"
            >
                {isProcessing ? (
                   <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Merging Files...</>
                ) : (
                   <>Combine {files.length ? files.length : ''} PDFs <Intersect weight="bold" size={20} /></>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MergeView;


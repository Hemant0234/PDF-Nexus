import React, { useState, useRef } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { ArrowLeft, Scissors, UploadSimple, DownloadSimple, CheckCircle, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react';

const SplitView = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setIsDone(false);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setIsDone(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('start_page', startPage);
    formData.append('end_page', endPage);

    try {
      const response = await axios.post(`${API_BASE}/split`, formData, {
        responseType: 'blob', // Important for downloading
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      // Construct download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `split_${startPage}_to_${endPage}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setIsDone(true);
    } catch (err) {
      console.error(err);
      let errorMessage = "An error occurred during splitting.";
      if (err.response && err.response.data && err.response.data instanceof Blob) {
         // Have to read blob to get json error if status 400
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
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            
            <Scissors className="text-5xl text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Split PDF Document</h2>
            <p className="text-gray-400 mb-8">Extract a custom range of pages from your PDF into a completely new document.</p>

            {/* File Upload / Selection */}
            {!file ? (
                <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-blue-500 hover:bg-gray-700/30 transition-all cursor-pointer group">
                   <UploadSimple size={48} className="text-gray-500 group-hover:text-blue-400 mx-auto mb-4 transition-colors" />
                   <h3 className="text-lg font-medium text-white">Click to Upload PDF</h3>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
                </div>
            ) : (
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700 text-left mb-6">
                   <div className="flex items-center justify-between">
                     <div className="truncate flex-1 font-medium text-white px-4">{file.name}</div>
                     <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-400 p-2"><ArrowCounterClockwise size={20} /></button>
                   </div>
                </div>
            )}

            {/* Settings */}
            {file && (
               <div className="grid grid-cols-2 gap-4 text-left my-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Page</label>
                    <input type="number" min="1" value={startPage} onChange={(e) => setStartPage(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">End Page</label>
                    <input type="number" min="1" value={endPage} onChange={(e) => setEndPage(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
                  </div>
               </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6 text-left">
                    <WarningCircle size={24} weight="fill" /> <span>{error}</span>
                </div>
            )}
            
            {/* Success Message */}
            {isDone && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 mb-6 text-left">
                    <CheckCircle size={24} weight="fill" /> <span>PDF Split Successfully! Your download should have started.</span>
                </div>
            )}

            {/* Action */}
            <button 
                onClick={handleProcess}
                disabled={!file || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
            >
                {isProcessing ? (
                   <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Extracting Pages...</>
                ) : (
                   <>Split Document <Scissors weight="bold" size={20} /></>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SplitView;


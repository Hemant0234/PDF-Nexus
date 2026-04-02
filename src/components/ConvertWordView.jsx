import React, { useState, useRef } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { ArrowLeft, FileDoc, UploadSimple, CheckCircle, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react';

const ConvertWordView = ({ onBack }) => {
  const [file, setFile] = useState(null);
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

    try {
      const response = await axios.post(`${API_BASE}/convert-word`, formData, {
        responseType: 'blob', // Important for downloading binary
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'converted_document.docx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setIsDone(true);
    } catch (err) {
      console.error(err);
      let errorMessage = "An error occurred during conversion.";
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
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            
            <FileDoc className="text-5xl text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">PDF to Word Conversion</h2>
            <p className="text-gray-400 mb-8">Convert your non-editable PDF files into an editable Microsoft Word document.</p>

            {/* File Upload / Selection */}
            {!file ? (
                <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-green-500 hover:bg-gray-700/30 transition-all cursor-pointer group">
                   <UploadSimple size={48} className="text-gray-500 group-hover:text-green-400 mx-auto mb-4 transition-colors" />
                   <h3 className="text-lg font-medium text-white">Click to Upload PDF</h3>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
                </div>
            ) : (
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700 text-left mb-6 mt-4">
                   <div className="flex items-center justify-between">
                     <div className="truncate flex-1 font-medium text-white px-4">{file.name}</div>
                     <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-400 p-2"><ArrowCounterClockwise size={20} /></button>
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
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 mb-6 text-left mt-4">
                    <CheckCircle size={24} weight="fill" /> <span>Converted to Word! Your DOCX file download should have started.</span>
                </div>
            )}

            {/* Action */}
            <button 
                onClick={handleProcess}
                disabled={!file || isProcessing}
                className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-8 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)]"
            >
                {isProcessing ? (
                   <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Parsing document...</>
                ) : (
                   <>Convert to Word <FileDoc weight="bold" size={20} /></>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertWordView;


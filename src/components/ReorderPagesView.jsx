import React, { useState, useRef } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { ArrowLeft, Rows, UploadSimple, DownloadSimple, CheckCircle, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Individual sortable thumbnail item
function SortableItem({ id, originalIndex, thumbnailData }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.3)' : 'none',
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners} 
        className="cursor-pointer border-2 border-gray-700 bg-gray-800 p-2 rounded-xl relative hover:border-yellow-500/50 transition-colors bg-white shadow-sm flex flex-col justify-between"
    >
      <div className="bg-gray-200 border border-gray-300 w-full aspect-[1/1.4] relative overflow-hidden flex items-center justify-center">
         <img src={thumbnailData} alt={`Page`} className="object-cover w-full h-full pointer-events-none" />
      </div>
      <div className="bg-gray-800 mt-2 rounded-md font-bold text-center py-1 text-gray-300 border border-gray-700">
          Page {originalIndex + 1}
      </div>
    </div>
  );
}

const ReorderPagesView = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [thumbnails, setThumbnails] = useState([]); // [{id: "0", originalIndex: 0, data: "base64..."}]
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsDone(false);
      setError(null);
      setThumbnails([]);
      
      // Immediately extract thumbnails
      await extractThumbnails(selectedFile);
    }
  };

  const extractThumbnails = async (pdfFile) => {
    setIsExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const response = await axios.post(`${API_BASE}/extract-thumbnails`, formData);
      
      setFileId(response.data.file_id);
      setThumbnails(response.data.thumbnails);
    } catch (err) {
      console.error(err);
      setError("Failed to extract pages. Is the PDF valid?");
      setFile(null); // Reset
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setThumbnails((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleProcess = async () => {
    if (!fileId || thumbnails.length === 0) {
      setError("No file or pages to reorder.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setIsDone(false);

    try {
      // Just extract the original raw IDs to send to PyPDF2
      const newOrderIds = thumbnails.map(t => t.id);
      
      const response = await axios.post(`${API_BASE}/reorder`, {
          file_id: fileId,
          new_order: newOrderIds
      }, {
          responseType: 'blob'
      });

      // Construct download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reordered_document.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setIsDone(true);
    } catch (err) {
      console.error(err);
      let errorMessage = "Error: " + (err.message || String(err));
      if (err.response && err.response.data && err.response.data instanceof Blob) {
         try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            errorMessage = json.error || errorMessage;
         } catch(e){}
      } else if (err.response && err.response.data) {
         try {
             errorMessage = err.response.data.error || JSON.stringify(err.response.data);
         } catch(e) {}
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out] flex flex-col h-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group bg-gray-800 border border-gray-700 py-2 px-4 rounded-lg hover:border-gray-500 w-fit shrink-0">
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </button>

      <div className="max-w-6xl mx-auto space-y-6 w-full flex-1 flex flex-col">
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex-1 flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-500"></div>
            
            <div className="text-center shrink-0">
                <Rows className="text-5xl text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Reorder PDF Pages</h2>
                <p className="text-gray-400 mb-8">Drag and drop the thumbnails to perfectly arrange your document before saving.</p>
            </div>

            {/* File Upload State */}
            {!file && !isExtracting && (
                <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-yellow-500 hover:bg-gray-700/30 transition-all cursor-pointer group mt-4 h-64 flex flex-col justify-center max-w-2xl mx-auto w-full">
                   <UploadSimple size={48} className="text-gray-500 group-hover:text-yellow-400 mx-auto mb-4 transition-colors" />
                   <h3 className="text-lg font-medium text-white text-center">Click to Upload PDF</h3>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
                </div>
            )}

            {/* Extracting State */}
            {isExtracting && (
                <div className="py-20 text-center animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-yellow-500 animate-spin mx-auto mb-4"></div>
                    <p className="text-yellow-500 font-medium">Extracting PDF pages... Please wait.</p>
                </div>
            )}

            {/* Workspace State */}
            {thumbnails.length > 0 && !isExtracting && (
               <div className="flex-1 flex flex-col overflow-hidden">
                   <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 text-left mb-4 flex items-center justify-between shrink-0">
                     <div className="truncate flex-1 font-medium text-white px-4">Currently Editing: {file.name} ({thumbnails.length} pages)</div>
                     <button onClick={() => {setFile(null); setThumbnails([]);}} className="text-gray-500 hover:text-red-400 p-2 bg-gray-800 rounded-lg"><ArrowCounterClockwise size={20} /></button>
                   </div>

                   {/* DND Workspace */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900/40 border border-gray-700/50 rounded-xl p-6 relative">
                       <DndContext 
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            <SortableContext 
                                items={thumbnails.map(t => t.id)}
                                strategy={rectSortingStrategy}
                            >
                                {thumbnails.map((thumb) => (
                                    <SortableItem key={thumb.id} id={thumb.id} originalIndex={thumb.originalIndex} thumbnailData={thumb.data} />
                                ))}
                            </SortableContext>
                            </div>
                        </DndContext>
                   </div>

                    {/* Messages */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mt-4 shrink-0 text-left">
                            <WarningCircle size={24} weight="fill" /> <span>{error}</span>
                        </div>
                    )}
                    
                    {isDone && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 mt-4 shrink-0 text-left">
                            <CheckCircle size={24} weight="fill" /> <span>Document Reordered! Download should have started automatically.</span>
                        </div>
                    )}

                   {/* Action */}
                   <button 
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] shrink-0"
                    >
                        {isProcessing ? (
                           <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Reassembling PDF...</>
                        ) : (
                           <>Save New Page Order <DownloadSimple weight="bold" size={20} /></>
                        )}
                    </button>
               </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReorderPagesView;


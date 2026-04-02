/**
 * PageThumbnailSidebar.jsx
 * Left sidebar displaying clickable page thumbnails.
 */
import React, { useEffect, useState } from 'react';

const PageThumbnailSidebar = ({ pdfDoc, numPages, activePage, onPageSelect, generateThumbnail }) => {
  const [thumbs, setThumbs] = useState({});

  useEffect(() => {
    if (!pdfDoc) return;
    // Generate thumbnails lazily
    const generate = async () => {
      for (let i = 1; i <= numPages; i++) {
        const dataUrl = await generateThumbnail(pdfDoc, i);
        setThumbs(prev => ({ ...prev, [i]: dataUrl }));
      }
    };
    generate();
  }, [pdfDoc, numPages, generateThumbnail]);

  return (
    <div className="w-36 shrink-0 bg-gray-900 border-r border-gray-700 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-3 items-center">
      {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
        <button
          key={pageNum}
          onClick={() => onPageSelect(pageNum)}
          className={`group flex flex-col items-center gap-1.5 px-2 w-full transition-all ${activePage === pageNum ? '' : 'opacity-60 hover:opacity-100'}`}
        >
          <div className={`border-2 rounded overflow-hidden shadow transition-all ${activePage === pageNum ? 'border-blue-500 shadow-blue-500/30' : 'border-gray-700 group-hover:border-gray-500'}`}>
            {thumbs[pageNum] ? (
              <img src={thumbs[pageNum]} alt={`Page ${pageNum}`} className="w-full block" />
            ) : (
              <div className="w-[104px] h-32 bg-gray-800 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-blue-500 animate-spin" />
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium">{pageNum}</span>
        </button>
      ))}
    </div>
  );
};

export default PageThumbnailSidebar;

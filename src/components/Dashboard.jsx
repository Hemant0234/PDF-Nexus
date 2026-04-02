import React, { useRef } from 'react';
import { CloudArrowUp, FolderOpen, ShieldCheck, Lightning, Intersect, Scissors, FileDoc, Image as ImageIcon, Rows, ArrowRight, AppWindow } from '@phosphor-icons/react';
import ToolCard from './ToolCard';

const Dashboard = ({ onToolSelect }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-brand-500', 'bg-gray-800/80');
    // If they strictly drop a file on dashboard, just send them to convert format by default
    onToolSelect('format');
  };

  return (
    <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
      <section className="relative group cursor-pointer" onClick={() => onToolSelect('format')}>
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-indigo-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-500"></div>
        <div 
          className="relative bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-[2rem] p-12 text-center transition-all duration-300 hover:border-brand-500/50 flex flex-col items-center justify-center min-h-[320px] shadow-2xl"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand-500', 'bg-gray-800/80'); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('border-brand-500', 'bg-gray-800/80'); }}
          onDrop={handleDrop}
        >
          <div className="w-24 h-24 rounded-3xl bg-gray-700/40 border border-gray-600/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner group-hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]">
            <AppWindow weight="duotone" className="text-5xl text-brand-400 animate-float drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
          </div>
          <h2 className="text-3xl font-semibold text-white mb-3 tracking-tight">Access Universal Format Converter</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">Click here or drag a file to enter the universal Format Converter workspace (PDF to PNG, JPG to PDF).</p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-semibold text-white tracking-tight">Dedicated Tools</h3>
          <a href="#" className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 bg-brand-500/10 px-4 py-2 rounded-lg border border-brand-500/20 hover:bg-brand-500/20">
            View All <ArrowRight />
          </a>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <style>{`
            .hover-orange:hover { border-color: rgba(249, 115, 22, 0.5); box-shadow: 0 15px 30px rgba(249, 115, 22, 0.15); }
            .hover-orange .icon-container { background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.2); color: #f97316; }
            .hover-orange:hover .icon-container { background: #f97316; color: white; box-shadow: 0 0 20px rgba(249, 115, 22, 0.5); }
            
            .hover-blue:hover { border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 15px 30px rgba(59, 130, 246, 0.15); }
            .hover-blue .icon-container { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #3b82f6; }
            .hover-blue:hover .icon-container { background: #3b82f6; color: white; box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
            
            .hover-green:hover { border-color: rgba(34, 197, 94, 0.5); box-shadow: 0 15px 30px rgba(34, 197, 94, 0.15); }
            .hover-green .icon-container { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #22c55e; }
            .hover-green:hover .icon-container { background: #22c55e; color: white; box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); }
            
            .hover-pink:hover { border-color: rgba(236, 72, 153, 0.5); box-shadow: 0 15px 30px rgba(236, 72, 153, 0.15); }
            .hover-pink .icon-container { background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.2); color: #ec4899; }
            .hover-pink:hover .icon-container { background: #ec4899; color: white; box-shadow: 0 0 20px rgba(236, 72, 153, 0.5); }
            
            .hover-yellow:hover { border-color: rgba(234, 179, 8, 0.5); box-shadow: 0 15px 30px rgba(234, 179, 8, 0.15); }
            .hover-yellow .icon-container { background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2); color: #eab308; }
            .hover-yellow:hover .icon-container { background: #eab308; color: white; box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }

            .hover-red:hover { border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 15px 30px rgba(239, 68, 68, 0.15); }
            .hover-red .icon-container { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; }
            .hover-red:hover .icon-container { background: #ef4444; color: white; box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
            
            .hover-brand:hover { border-color: rgba(139, 92, 246, 0.5); box-shadow: 0 15px 30px rgba(139, 92, 246, 0.15); }
            .hover-brand .icon-container { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); color: #8b5cf6; }
            .hover-brand:hover .icon-container { background: #8b5cf6; color: white; box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
          `}</style>

          <ToolCard onClick={() => onToolSelect('merge')} title="Merge PDF" description="Combine multiple PDFs into a single document." icon={Intersect} colorClass="hover-orange" baseColor="from-orange-500/5 to-transparent" />
          <ToolCard onClick={() => onToolSelect('split')} title="Split PDF" description="Extract pages or split your PDF into separate files." icon={Scissors} colorClass="hover-blue" baseColor="from-blue-500/5 to-transparent" />
          <ToolCard onClick={() => onToolSelect('reorder')} title="Reorder Pages" description="Rearrange the pages of your PDF document interactively." icon={Rows} colorClass="hover-yellow" baseColor="from-yellow-500/5 to-transparent" />
          <ToolCard onClick={() => onToolSelect('edit')} title="Edit Text" description="Extract, edit, and reconstruct PDF text completely." icon={FileDoc} colorClass="hover-red" baseColor="from-red-500/5 to-transparent" />
          <ToolCard onClick={() => onToolSelect('word')} title="PDF to Word" description="Convert your PDF files to editable Word documents." icon={FileDoc} colorClass="hover-green" baseColor="from-green-500/5 to-transparent" />
          <ToolCard onClick={() => onToolSelect('resize')} title="Resize Image" description="Compress and resize images for your documents." icon={ImageIcon} colorClass="hover-pink" baseColor="from-pink-500/5 to-transparent" />
          <ToolCard onClick={() => onToolSelect('format')} title="Convert Format" description="Swap freely between PNG, JPG, and PDF." icon={AppWindow} colorClass="hover-brand" baseColor="from-brand-500/5 to-transparent" />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

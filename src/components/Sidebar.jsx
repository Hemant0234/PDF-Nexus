import React from 'react';
import { Files, SquaresFour, ClockCounterClockwise, Intersect, Scissors, FileDoc, Image as ImageIcon, Rows, PencilSimple, AppWindow } from '@phosphor-icons/react';

const Sidebar = ({ activeTool, onToolSelect }) => {
  const NavItem = ({ id, icon: Icon, label, colorClass = "text-gray-400" }) => {
    const isActive = activeTool === id || (id === 'dashboard' && activeTool === null);
    
    return (
      <button 
        onClick={() => onToolSelect(id === 'dashboard' ? null : id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
          isActive 
            ? "bg-brand-600/10 text-brand-400 border border-brand-500/20 shadow-[0_0_15px_rgba(124,58,237,0.1)]" 
            : "text-gray-400 hover:text-gray-100 hover:bg-gray-700/50"
        }`}
      >
        <Icon size={20} className={`${isActive ? 'text-brand-400' : 'group-hover:text-white group-hover:scale-110'} transition-all`} />
        {label}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700/50 hidden md:flex flex-col h-screen fixed top-0 left-0 z-20 transition-all duration-300 shadow-2xl">
      <div className="flex-shrink-0 h-20 flex items-center px-8 border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3 text-brand-400 cursor-pointer" onClick={() => onToolSelect(null)}>
          <Files weight="fill" className="text-3xl drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
          <span className="text-xl font-bold text-white tracking-wide">PDF Nexus</span>
        </div>
      </div>
      
      <div className="px-4 py-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mb-8">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Main</p>
          <nav className="space-y-1">
            <NavItem id="dashboard" icon={SquaresFour} label="Dashboard" />
            <NavItem id="recent" icon={ClockCounterClockwise} label="Recent Files" />
          </nav>
        </div>
        
        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tools</p>
          <nav className="space-y-1">
            <NavItem id="merge" icon={Intersect} label="Merge PDF" />
            <NavItem id="split" icon={Scissors} label="Split PDF" />
            <NavItem id="edit" icon={PencilSimple} label="Edit PDF" />
            <NavItem id="word" icon={FileDoc} label="PDF to Word" />
            <NavItem id="resize" icon={ImageIcon} label="Resize Image" />
            <NavItem id="reorder" icon={Rows} label="Reorder Pages" />
            <NavItem id="format" icon={AppWindow} label="Format Converter" />
          </nav>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700/50 bg-gray-800/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-2 cursor-pointer group">
          <img src={`https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff`} alt="Profile" className="w-10 h-10 rounded-full border border-gray-600 group-hover:border-brand-400 transition-colors" />
          <div>
            <p className="text-sm font-medium text-white">Pro User</p>
            <p className="text-xs text-gray-400">Settings</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Bell, UserCircle, Sun, Moon } from '@phosphor-icons/react';

const Header = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Check if user previously preferred light mode
    if (localStorage.getItem('theme') === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.add('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 lg:px-8 z-10 transition-colors duration-300">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search for tools, files, or settings..." 
            className="w-full bg-gray-800 border-2 border-transparent text-gray-100 placeholder-gray-500 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 focus:bg-gray-800/80 transition-all font-medium"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors relative">
          {isDarkMode ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
        </button>
        <button className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors relative">
          <Bell size={20} weight="duotone" />
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-gray-800"></span>
        </button>
        <div className="w-px h-8 bg-gray-800 mx-2"></div>
        <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center border border-white/10 shadow-lg shadow-brand-500/20">
            <UserCircle size={28} className="text-white" weight="fill" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-bold text-white leading-tight">Workspace</p>
            <p className="text-xs text-brand-400 font-medium tracking-wide border-t border-brand-500/20 mt-0.5 pt-0.5">PRO</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;

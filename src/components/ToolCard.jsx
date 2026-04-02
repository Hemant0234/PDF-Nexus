import React from 'react';

const ToolCard = ({ title, description, icon: Icon, colorClass, baseColor, onClick }) => {
  return (
    <div onClick={onClick} className={`bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transition-all duration-500 cursor-pointer group hover:-translate-y-2 relative overflow-hidden ${colorClass}`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${baseColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 relative z-10 icon-container`}>
        <Icon size={32} weight="regular" className="icon-svg" />
      </div>
      <h4 className="text-lg font-medium text-white mb-2 relative z-10">{title}</h4>
      <p className="text-sm text-gray-400 leading-relaxed relative z-10">{description}</p>
    </div>
  );
};

export default ToolCard;

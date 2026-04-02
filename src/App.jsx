import React, { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MergeView from './components/MergeView';
import SplitView from './components/SplitView';
import ConvertWordView from './components/ConvertWordView';
import ResizeImageView from './components/ResizeImageView';
import FormatView from './components/FormatView';
import ReorderPagesView from './components/ReorderPagesView';
import EditPDFView from './components/EditPDFView';

function App() {
  const [activeTool, setActiveTool] = useState(null);

  const handleToolSelect = (toolId) => {
    setActiveTool(toolId);
  };

  const handleBackToDashboard = () => {
    setActiveTool(null);
  };

  const renderActiveView = () => {
    switch (activeTool) {
      case 'merge': return <MergeView key="merge" onBack={handleBackToDashboard} />;
      case 'split': return <SplitView key="split" onBack={handleBackToDashboard} />;
      case 'reorder': return <ReorderPagesView key="reorder" onBack={handleBackToDashboard} />;
      case 'edit': return <EditPDFView key="edit" onBack={handleBackToDashboard} />;
      case 'word': return <ConvertWordView key="word" onBack={handleBackToDashboard} />;
      case 'resize': return <ResizeImageView key="resize" onBack={handleBackToDashboard} />;
      case 'format': return <FormatView key="format" onBack={handleBackToDashboard} />;
      default: return <Dashboard key="dashboard" onToolSelect={handleToolSelect} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden text-gray-300 font-sans selection:bg-brand-500 selection:text-white transition-colors duration-300">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' } }} />
      <Sidebar activeTool={activeTool} onToolSelect={handleToolSelect} />
      <div className="flex-1 flex flex-col relative md:ml-64 focus-layout transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTool ? activeTool : 'dashboard'}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full"
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

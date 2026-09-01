import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbX, TbExternalLink, TbReload, TbArrowLeft, TbArrowRight } from "react-icons/tb";

const BrowserPreview = ({ isOpen, onClose, actualUrl, port = 3000 }) => {
  const [displayUrl, setDisplayUrl] = useState(`localhost:${port}`);
  const [iframeKey, setIframeKey] = useState(0); // Used to force refresh the iframe
  const [currentFrameUrl, setCurrentFrameUrl] = useState(actualUrl);

  useEffect(() => {
    if (actualUrl) {
      setDisplayUrl(`localhost:${port}`); // Mask the ugly URL
      setCurrentFrameUrl(actualUrl);
    }
  }, [actualUrl, port]);

  const handleUrlSubmit = (e) => {
    if (e.key === 'Enter' && actualUrl) {
      const regex = new RegExp(`^localhost:${port}\\/?`);
      let path = displayUrl.replace(/^https?:\/\//, '').replace(regex, '');
      if (path.length > 0 && !path.startsWith('/')) path = '/' + path;
      
      try {
        const baseOrigin = new URL(actualUrl).origin;
        setCurrentFrameUrl(`${baseOrigin}${path}`);
      } catch (err) {
        console.error("Invalid base URL", err);
      }
    }
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenInNewTab = () => {
    if (currentFrameUrl) {
      window.open(currentFrameUrl, '_blank');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-[80vw] h-[80vh] bg-gray-200 rounded-lg shadow-2xl border border-gray-400 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mac-like Browser Header */}
            <div className="flex items-center justify-between p-2 bg-gray-300 border-b border-gray-400">
              <div className="flex items-center space-x-4">
                {/* Window Controls */}
                <div className="flex space-x-2 ml-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover:bg-red-600" onClick={onClose}></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex space-x-2 text-gray-600">
                  <button className="p-1 rounded hover:bg-gray-400/50 transition-colors disabled:opacity-50" disabled>
                    <TbArrowLeft size={18} />
                  </button>
                  <button className="p-1 rounded hover:bg-gray-400/50 transition-colors disabled:opacity-50" disabled>
                    <TbArrowRight size={18} />
                  </button>
                  <button onClick={handleRefresh} className="p-1 rounded hover:bg-gray-400/50 transition-colors">
                    <TbReload size={18} />
                  </button>
                </div>
              </div>

              {/* Address Bar */}
              <div className="flex-1 max-w-2xl mx-4">
                <div className="flex items-center bg-gray-100 rounded-md px-3 py-1 text-sm text-gray-700 shadow-inner">
                  <span className="text-gray-400 mr-2">🔒</span>
                  <input
                    type="text"
                    value={displayUrl}
                    onChange={(e) => setDisplayUrl(e.target.value)}
                    onKeyDown={handleUrlSubmit}
                    className="bg-transparent outline-none flex-1 min-w-0"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 mr-2">
                <button
                  onClick={handleOpenInNewTab}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-400/50 rounded transition-colors"
                  title="Open in new tab"
                >
                  <TbExternalLink size={20} />
                </button>
              </div>
            </div>

            {/* Iframe Content */}
            <div className="flex-1 bg-white relative">
              {currentFrameUrl ? (
                <iframe
                  key={iframeKey}
                  src={currentFrameUrl}
                  allow="cross-origin-isolated"
                  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                  title="WebContainer Preview"
                  className="w-full h-full bg-white absolute inset-0 border-none"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-3">🌐</div>
                    <div>Connecting to Dev Server...</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BrowserPreview;

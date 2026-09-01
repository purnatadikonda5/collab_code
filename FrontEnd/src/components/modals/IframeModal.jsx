import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbX, TbExternalLink, TbEdit, TbCheck } from "react-icons/tb";

const IframeModal = ({ isOpen, onClose, iframeUrl, onUrlChange }) => {
  const [editableUrl, setEditableUrl] = useState(iframeUrl || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditableUrl(iframeUrl || '');
  }, [iframeUrl]);

  const handleOpenInNewTab = () => {
    if (editableUrl) {
      window.open(editableUrl, '_blank');
    }
  };

  const handleUrlEdit = () => {
    setIsEditing(true);
  };

  const handleUrlSave = () => {
    setIsEditing(false);
    onUrlChange(editableUrl);
  };

  const handleUrlKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUrlSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditableUrl(iframeUrl || '');
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
            className="w-[70vw] h-[70vh] bg-gray-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700/50 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800/70 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="text-lg font-semibold text-cyan-100">
                  Preview
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400 font-mono bg-gray-700/50 px-2 py-1 rounded max-w-md">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableUrl}
                      onChange={(e) => setEditableUrl(e.target.value)}
                      onKeyDown={handleUrlKeyPress}
                      onBlur={handleUrlSave}
                      className="bg-transparent outline-none text-gray-300 flex-1 min-w-0"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{editableUrl}</span>
                  )}
                  <button
                    onClick={isEditing ? handleUrlSave : handleUrlEdit}
                    className="text-gray-400 hover:text-cyan-300 transition-colors"
                    title={isEditing ? "Save URL" : "Edit URL"}
                  >
                    {isEditing ? <TbCheck size={16} /> : <TbEdit size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleOpenInNewTab}
                  className="p-2 text-gray-300 hover:text-cyan-300 hover:bg-gray-700/50 rounded-md transition-colors"
                  title="Open in new tab"
                >
                  <TbExternalLink size={20} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-300 hover:text-red-300 hover:bg-gray-700/50 rounded-md transition-colors"
                  title="Close preview"
                >
                  <TbX size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner">
                {editableUrl ? (
                  <iframe
                    src={editableUrl}
                    className="w-full h-full border-none"
                    title="Code Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <div className="text-center text-gray-500">
                      <div className="text-2xl mb-2">⏳</div>
                      <div>Loading preview...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-800/70 border-t border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  <span className="text-cyan-300 font-semibold">CollabCode</span> - Where ideas come to life through collaborative coding! 🚀✨
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600/80 hover:bg-gray-500 text-white rounded-md transition-colors shadow-md font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IframeModal;
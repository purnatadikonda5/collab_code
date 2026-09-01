"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Create a context for the modal
const ModalContext = React.createContext();

// Hook to use the modal context
export const useModal = () => {
  const context = React.useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a Modal component");
  }
  return context;
};

export const Modal = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const closeModal = () => {
    setIsOpen(false);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  // Context to pass down the open/close functionality
  const modalContext = React.useMemo(
    () => ({
      isOpen,
      openModal,
      closeModal,
    }),
    [isOpen]
  );

  return (
    <ModalContext.Provider value={modalContext}>{children}</ModalContext.Provider>
  );
};

export const ModalTrigger = ({ children, className, ...props }) => {
  const { openModal } = useModal();
  return (
    <button onClick={openModal} className={className} {...props}>
      {children}
    </button>
  );
};

export const ModalBody = ({ children }) => {
  const { isOpen, closeModal } = useModal();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const ModalContent = ({ children }) => {
  return <div className="p-6">{children}</div>;
};

export const ModalFooter = ({ children, className = "" }) => {
  return (
    <div className={`p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end ${className}`}>
      {children}
    </div>
  );
};
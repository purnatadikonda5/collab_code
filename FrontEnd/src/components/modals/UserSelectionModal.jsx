import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbX } from "react-icons/tb";

const UserSelectionModal = ({ isOpen, onClose, users, selectedUsers, setSelectedUsers }) => {
  if (!isOpen) return null;

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-transparent backdrop-blur-md z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.5 } }}
        exit={{ opacity: 0, transition: { duration: 0.5 } }}
      >
        <motion.div
          className="bg-[#0A1E2E] text-white rounded-lg shadow-lg w-full max-w-lg p-6 relative"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }}
          exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.5 } }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
          >
            <TbX size={24} />
          </button>

          <h2 className="text-2xl font-semibold mb-4 text-center">Select Users</h2>

          <div className="max-h-64 overflow-y-auto pr-2" style={{ scrollbarWidth: "none" }}>
            {users.map((user) => (
              <div
                key={user._id}
                className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition ${
                  selectedUsers.includes(user._id)
                    ? "bg-[#0E3A5A] text-[#00BEDE] shadow-md"
                    : "bg-[#112233] hover:bg-[#0D2A46]"
                }`}
                onClick={() => toggleUserSelection(user._id)}
              >
                <div>
                  <p className="font-medium">{user.firstname}</p>
                  <p className="text-sm text-gray-300 mt-1 w-[250px] truncate">{user.email}</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user._id)}
                  readOnly
                  className="w-5 h-5 accent-[#00BEDE]"
                />
              </div>
            ))}
          </div>

          <motion.button
            onClick={onClose}
            className="w-full mt-4 py-3 text-lg font-semibold text-white rounded-lg relative overflow-hidden bg-[#0088A8] shadow-lg"
            animate={{
              boxShadow: [
                "0px 0px 8px 2px rgba(0,190,222,0.6)",
                "0px 0px 12px 3px rgba(0,190,222,0.6)",
                "0px 0px 8px 2px rgba(0,190,222,0.6)"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            Done
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserSelectionModal;

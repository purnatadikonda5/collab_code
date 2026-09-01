import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../config/axios.js"; // Adjust path if needed

const GitModal = ({ isOpen, onClose, projectName, user }) => {
  const [commitMessage, setCommitMessage] = useState("");
  const [logs, setLogs] = useState([]);
  const [pushRemoteUrl, setPushRemoteUrl] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [commitStatus, setCommitStatus] = useState("");

  // Fetch commit logs for display
  const fetchLogs = async () => {
    try {
      const res = await axios.get("/git/logs", {
        params: { projectName }
      });
      if (res.data.success) {
        setLogs(res.data.commits);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  // Trigger commit changes
  const handleCommit = async () => {
    try {
      const payload = {
        projectName,
        commitMessage,
        // Optionally, pass dynamic author info if available
        authorName: user.name,
        authorEmail: user.email
      };
      const res = await axios.post("/git/commit", payload);
      if (res.data.success) {
        setCommitStatus(res.data.message);
        fetchLogs();
      } else {
        setCommitStatus("Commit failed: " + res.data.message);
      }
    } catch (error) {
      console.error("Commit error:", error);
      setCommitStatus("Commit failed: " + error.message);
    }
  };

  // Trigger push changes
  const handlePush = async () => {
    try {
      const payload = {
        projectName,
        remoteUrl: pushRemoteUrl
        // Credentials will be taken from environment or can be added here
      };
      const res = await axios.post("/git/push", payload);
      alert(res.data.message);
    } catch (error) {
      console.error("Push error:", error);
      alert("Push failed: " + error.response?.data?.message || error.message);
    }
  };

  // Fetch logs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-gray-800 text-white rounded-lg p-6 w-96 relative">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-300 hover:text-white"
            >
              X
            </button>
            <h2 className="text-xl font-semibold mb-4">Git Operations</h2>
            <div className="space-y-4">
              <button
                onClick={handleCommit}
                className="w-full bg-blue-600 py-2 rounded hover:bg-blue-500"
              >
                Commit Changes
              </button>
              {commitStatus && <p>{commitStatus}</p>}
              <div>
                <input
                  type="text"
                  placeholder="Remote URL (for push)"
                  value={pushRemoteUrl}
                  onChange={(e) => setPushRemoteUrl(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 mb-2"
                />
                <button
                  onClick={handlePush}
                  className="w-full bg-purple-600 py-2 rounded hover:bg-purple-500"
                >
                  Push Changes
                </button>
              </div>
              <div>
                <button
                  onClick={fetchLogs}
                  className="w-full bg-yellow-600 py-2 rounded hover:bg-yellow-500"
                >
                  Refresh Commit History
                </button>
                {logs.length > 0 && (
                  <div className="mt-4 max-h-40 overflow-auto">
                    <h3 className="text-lg font-semibold mb-2">Commit History:</h3>
                    <ul className="text-sm">
                      {logs.map((commit, index) => (
                        <li key={index} className="border-b border-gray-600 py-1">
                          <strong>{commit.sha.substring(0, 7)}</strong>: {commit.message}
                          <div className="text-xs text-gray-400">
                            Author: {commit.author.name} &lt;{commit.author.email}&gt;
                            <br />
                            Committer: {commit.committer.name} &lt;{commit.committer.email}&gt;
                            <br />
                            Date: {new Date(commit.date).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GitModal;

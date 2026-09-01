import { useState, useEffect } from 'react';
import { getSocket, receiveMessage, sendMessage } from '@/config/socket.js';

export const useAIAgent = (projectId, webContainerInstance, setMessages) => {
  const [agentStatus, setAgentStatus] = useState(null);
  const [agentThoughts, setAgentThoughts] = useState([]);

  useEffect(() => {
    if (!projectId) return;

    // Check if socket is initialized yet
    const socket = getSocket();
    if (!socket) {
      const timer = setTimeout(() => {
        // Force a re-render to check if socket is ready
        setAgentThoughts(prev => [...prev]);
      }, 300);
      return () => clearTimeout(timer);
    }

    receiveMessage("agent:thought", (data) => {
      setAgentStatus((prev) => prev?.type === 'error' ? prev : { type: 'thinking' });
      setAgentThoughts((prev) => (prev || "") + data.thought);
    });

    receiveMessage("agent:tool_call", (data) => {
      setAgentStatus({ type: 'tool_call', tool: data.tool, args: data.arguments });
    });

    receiveMessage("agent:tool_result", (data) => {
      setAgentStatus({ type: 'tool_result', tool: data.tool });
    });

    receiveMessage("agent:final_answer", (data) => {
      setAgentStatus(null);
      setAgentThoughts("");
      const newChatMsg = {
        _id: Date.now().toString(),
        project: projectId,
        message: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sender: { email: "AI@ai.com" }
      };
      if (setMessages) {
        setMessages((prev) => [...prev, newChatMsg]);
      }
    });

    receiveMessage("agent:error", (data) => {
      setAgentStatus({ type: 'error', error: data.message });
      setTimeout(() => setAgentStatus(null), 5000);
    });

    // Terminal Bridge
    receiveMessage("execute-command", async (data, callback) => {
      if (!webContainerInstance) {
        console.warn("WebContainer not ready to execute command.");
        if (callback) callback(new Error("WebContainer not ready"), null);
        return;
      }

      try {
        console.log(`[Agent Shell Bridge] Executing: ${data.command}`);
        const process = await webContainerInstance.spawn('jsh', ['-c', data.command]);
        let output = "";
        
        process.output.pipeTo(new WritableStream({
          write(chunk) {
            output += chunk;
          }
        }));
        
        const exitCode = await process.exit;
        console.log(`[Agent Shell Bridge] Finished with exit code: ${exitCode}`);
        
        if (callback) {
          callback(null, [output]);
        }
      } catch (err) {
        console.error("[Agent Shell Bridge] Error:", err);
        if (callback) callback(err, null);
      }
    });

  }, [projectId, webContainerInstance, setMessages, getSocket()]);

  const stopGeneration = () => {
    sendMessage("agent:stop", { projectId });
    setAgentStatus(null);
    setAgentThoughts("");
  };

  return { agentStatus, agentThoughts, stopGeneration };
};

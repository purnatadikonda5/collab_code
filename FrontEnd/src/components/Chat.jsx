import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Message from './Message';
import PlaceholdersAndVanishInput from './PlaceholdersAndVanishInput';
import TracingBeam from './TracingBeam';
import { TbPlayerStopFilled, TbLoader, TbSearch, TbEdit, TbTerminal2, TbTrash, TbFileText } from 'react-icons/tb';

const Chat = ({
  messages,
  user,
  agentStatus,
  agentThoughts,
  stopGeneration,
  message,
  setMessage,
  handleSendMessage,
  openMenuId,
  setOpenMenuId,
  handleDeleteMessage,
  handleEditMessage
}) => {
  const messagesEndRef = useRef(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const slashCommands = [
    {
      name: '/clearTheCode',
      description: 'Clear and reset the project Vector DB index',
      icon: <TbTrash className="text-amber-400" size={16} />,
      command: '/clearTheCode'
    },
    {
      name: '/ExplainTheCode',
      description: 'Create an architecture breakdown document (e.g. /ExplainTheCode auth)',
      icon: <TbFileText className="text-cyan-400" size={16} />,
      command: '/ExplainTheCode '
    }
  ];

  const filteredCommands = slashCommands.filter(c => 
    c.name.toLowerCase().includes(slashFilter.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentStatus, agentThoughts]);

  // Handle typing '/' for Slash Command popup
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashFilter(val);
      setSelectedIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  const selectCommand = (cmd) => {
    setMessage(cmd.command);
    setShowSlashMenu(false);
  };

  const handleKeyDown = (e) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectCommand(filteredCommands[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSlashMenu(false);
      }
    }
  };

  const placeholders = [
    "Type / for commands (/clearTheCode, /ExplainTheCode)...",
    "Type @ai to let the agent modify your files...",
    "Ask CollabCode AI to explain the code...",
    "Add a new login endpoint...",
  ];

  // Dynamic status details
  const getStatusDetails = () => {
    if (!agentStatus) return { text: "AI Thinking...", icon: <TbLoader className="animate-spin text-cyan-400" size={14} />, color: "text-cyan-400" };
    
    if (agentStatus.type === 'tool_call') {
      let args = {};
      if (agentStatus.args) {
        try {
          args = typeof agentStatus.args === 'string' ? JSON.parse(agentStatus.args) : agentStatus.args;
        } catch (e) {}
      }

      const getFilename = () => args.filePath ? args.filePath.split('/').pop() : 'file';

      switch(agentStatus.tool) {
        case 'search_code': return { text: `Searching codebase for "${args.query || '...'}"`, icon: <TbSearch className="animate-pulse text-blue-400" size={14} />, color: "text-blue-400" };
        case 'read_file': return { text: `Reading ${getFilename()}...`, icon: <TbSearch className="animate-pulse text-blue-400" size={14} />, color: "text-blue-400" };
        case 'list_directory': return { text: `Inspecting directory ${args.directoryPath || '/'}...`, icon: <TbSearch className="animate-pulse text-blue-400" size={14} />, color: "text-blue-400" };
        case 'write_file': return { text: `Writing ${getFilename()}...`, icon: <TbEdit className="animate-pulse text-emerald-400" size={14} />, color: "text-emerald-400" };
        case 'edit_file': return { text: `Modifying ${getFilename()}...`, icon: <TbEdit className="animate-pulse text-emerald-400" size={14} />, color: "text-emerald-400" };
        case 'create_directory': return { text: `Creating folder ${args.directoryPath || '...'}`, icon: <TbEdit className="animate-pulse text-emerald-400" size={14} />, color: "text-emerald-400" };
        case 'delete_file': return { text: `Deleting ${getFilename()}`, icon: <TbTrash className="animate-pulse text-red-400" size={14} />, color: "text-red-400" };
        case 'run_terminal_command': {
          const cmd = args.command || 'command';
          const shortCmd = cmd.length > 25 ? cmd.substring(0, 25) + '...' : cmd;
          return { text: `Running \`${shortCmd}\``, icon: <TbTerminal2 className="animate-pulse text-amber-400" size={14} />, color: "text-amber-400" };
        }
        default: return { text: `Using ${agentStatus.tool}...`, icon: <TbLoader className="animate-spin text-cyan-400" size={14} />, color: "text-cyan-400" };
      }
    } else if (agentStatus.type === 'tool_result') {
      const formatToolName = (toolName) => {
        if (!toolName) return 'results';
        return toolName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };
      return { text: `Analyzing ${formatToolName(agentStatus.tool)} output...`, icon: <TbLoader className="animate-spin text-slate-400" size={14} />, color: "text-slate-400" };
    } else if (agentStatus.type === 'error') {
      return { text: `Error: ${agentStatus.error}`, icon: null, color: "text-red-400" };
    }

    return { text: "AI Agent active...", icon: <TbLoader className="animate-spin text-cyan-400" size={14} />, color: "text-cyan-400" };
  };

  const statusInfo = getStatusDetails();
  const isAgentActive = Boolean(agentStatus || (typeof agentThoughts === 'string' ? agentThoughts.length > 0 : agentThoughts?.length > 0));

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-b-xl md:rounded-r-xl overflow-hidden shadow-2xl border-l border-slate-700/50 relative">
      
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700/50 flex justify-between items-center z-10 shadow-sm h-14">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          <h2 className="text-white font-bold tracking-wider text-sm">CollabCode Chat</h2>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4 custom-scrollbar relative z-0">
        <TracingBeam>
          {messages.map((msg) => {
            const isAI = msg.sender?.email === 'AI@ai.com' || msg.email === 'AI@ai.com';
            let rawContent = msg.message;
            if (isAI && typeof rawContent === 'string') {
              try {
                const parsed = JSON.parse(rawContent);
                if (parsed && parsed.text) rawContent = parsed.text;
              } catch (e) {
                // not JSON, keep original string
              }
            }

            return (
              <div key={msg._id} className="mb-4">
                {isAI ? (
                  <div className="flex flex-col bg-slate-800/80 rounded-lg p-4 border border-cyan-900/30 shadow-md mr-4 ml-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-900/50 border border-cyan-500/50 flex items-center justify-center text-cyan-300 text-xs font-bold">
                        AI
                      </div>
                      <span className="text-cyan-300 text-xs font-semibold tracking-wide">CollabCode Agent</span>
                      <span className="text-slate-500 text-[10px] ml-auto">{msg.timestamp || msg.createdAt}</span>
                    </div>
                    <div className="text-slate-200 text-sm prose prose-invert prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700/50 max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {rawContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <Message
                    message={msg}
                    sender={msg.sender?.email || msg.email}
                    content={msg.message}
                    timestamp={msg.timestamp || msg.createdAt}
                    userEmail={user.email}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onDelete={handleDeleteMessage}
                    onEdit={handleEditMessage}
                  />
                )}
              </div>
            );
          })}

          {/* Unified Persistent Streaming AI Activity Box */}
          {isAgentActive && (
            <div className="flex flex-col bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-4 border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] mr-4 ml-1 mb-4 transition-all duration-500 overflow-hidden relative">
              
              {/* Subtle top glow */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
              
              <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 shadow-inner">
                    {statusInfo.icon}
                  </div>
                  <span className={`text-sm font-semibold tracking-wide ${statusInfo.color} flex items-center gap-2`}>
                    {statusInfo.text}
                  </span>
                </div>
                <button 
                  onClick={stopGeneration}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-red-500/30 hover:border-red-500/50 transition-all active:scale-95"
                >
                  <TbPlayerStopFilled size={12} /> Stop
                </button>
              </div>

              {/* Streaming Content Buffer */}
              {Boolean(agentThoughts) && (
                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80 shadow-inner">
                  <div className="text-slate-300 text-sm font-mono max-h-56 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed pr-2">
                    {typeof agentThoughts === 'string' ? agentThoughts : agentThoughts.join('\n')}
                    <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-1.5 align-middle animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </TracingBeam>
      </div>

      {/* Input Area with Slash Commands Menu */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-800/90 flex flex-col relative z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.2)]">
        
        {/* Slash Command Popup Dropdown */}
        {showSlashMenu && filteredCommands.length > 0 && (
          <div className="absolute bottom-full mb-2 left-3 right-3 bg-slate-800 border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="p-2 bg-slate-900/80 border-b border-slate-700/50 text-[11px] font-semibold text-cyan-400 tracking-wider uppercase flex justify-between">
              <span>Slash Commands</span>
              <span className="text-slate-500">↑↓ to navigate, Enter to select</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.name}
                  onClick={() => selectCommand(cmd)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    idx === selectedIndex ? 'bg-cyan-950/80 border border-cyan-500/50 text-white' : 'hover:bg-slate-700/50 text-slate-300'
                  }`}
                >
                  <div className="p-1.5 rounded-md bg-slate-900 border border-slate-700">
                    {cmd.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-cyan-300">{cmd.name}</div>
                    <div className="text-[11px] text-slate-400">{cmd.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <PlaceholdersAndVanishInput
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholders={placeholders}
          onSubmit={handleSendMessage}
        />
      </div>
      
    </div>
  );
};

export default Chat;

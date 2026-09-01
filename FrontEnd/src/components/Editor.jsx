import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useLocation,useParams } from "react-router-dom";
import { TbUsers, TbUsersPlus, TbSend, TbX, TbFolder, TbFolderOpen, TbFile, TbPlayerPlay, TbBrowser } from "react-icons/tb";
import { DiJavascript1, DiHtml5, DiCss3, DiReact } from "react-icons/di";
import { VscJson, VscMarkdown } from "react-icons/vsc";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { motion, AnimatePresence } from "framer-motion";
import PlaceholdersAndVanishInput from "./PlaceholdersAndVanishInput.jsx";
import TracingBeam from "../components/TracingBeam.jsx";
import axios from "../config/axios.js";
import UserSelectionModal from "./modals/UserSelectionModal.jsx";
import BrowserPreview from "./modals/BrowserPreview.jsx";
import { receiveMessage, sendMessage, initializeSocket } from "@/config/socket.js";
import { UserContext } from "@/context/Usercontext.jsx";
import Message from "./Message.jsx";
import { getWebContainer } from "@/config/webcontainer.js"; 
import { Editor as MonacoEditor } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import Terminal from "./Terminal.jsx";
import { useAIAgent } from "../hooks/useAIAgent.js";
import Chat from "./Chat.jsx";

// Utility function for merging class names
const cn = (...classes) => classes.filter(Boolean).join(" ");

const buildWebContainerTree = (flatTree) => {
  if (!flatTree) return {};
  const tree = {};
  for (const [path, node] of Object.entries(flatTree)) {
    const parts = path.split('/');
    let currentLevel = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!currentLevel[part]) {
        currentLevel[part] = { directory: {} };
      }
      currentLevel = currentLevel[part].directory;
    }
    currentLevel[parts[parts.length - 1]] = node;
  }
  return tree;
};

// Sidebar Component for Project Members
const Sidebar = ({ open, setOpen, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ x: "-100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "-100%", opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute left-0 top-0 h-full w-[400px] bg-gray-800/95 backdrop-blur-md z-30 shadow-xl rounded-r-lg"
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">
            <TbX size={24} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
);

const getFileIcon = (name) => {
  if (name.endsWith('.js')) return <DiJavascript1 className="text-yellow-400" size={16} />;
  if (name.endsWith('.jsx')) return <DiReact className="text-blue-400" size={16} />;
  if (name.endsWith('.html')) return <DiHtml5 className="text-orange-500" size={16} />;
  if (name.endsWith('.css')) return <DiCss3 className="text-blue-500" size={16} />;
  if (name.endsWith('.json')) return <VscJson className="text-green-400" size={16} />;
  if (name.endsWith('.md')) return <VscMarkdown className="text-blue-300" size={16} />;
  return <TbFile className="text-gray-400" size={16} />;
};

const FileTreeNode = ({ name, node, currentPath, currentFile, onSelect }) => {
  const isDir = 'directory' in node;
  const [isOpen, setIsOpen] = useState(false);
  
  if (isDir) {
    return (
      <div className="pl-2 mt-1">
        <div 
          className="flex items-center space-x-2 text-gray-300 hover:bg-gray-700/50 p-1 rounded cursor-pointer transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <TbFolderOpen className="text-cyan-400" size={16} /> : <TbFolder className="text-cyan-400" size={16} />}
          <span className="text-sm font-medium select-none">{name}</span>
        </div>
        {isOpen && (
          <div className="ml-3 border-l border-gray-600/50 pl-2">
            {Object.entries(node.directory).map(([childName, childNode]) => (
              <FileTreeNode
                key={childName}
                name={childName}
                node={childNode}
                currentPath={currentPath ? `${currentPath}/${childName}` : childName}
                currentFile={currentFile}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div 
      className={`flex items-center space-x-2 text-gray-300 hover:bg-gray-600/50 p-1 pl-2 mt-1 rounded cursor-pointer transition-colors ${
        currentFile === currentPath ? 'bg-cyan-600/30 text-cyan-200' : ''
      }`}
      onClick={() => onSelect(currentPath)}
    >
      {getFileIcon(name)}
      <span className="text-sm select-none truncate">{name}</span>
    </div>
  );
};

const Editor = () => {
  const location = useLocation();
  // const [projectData, setProjectData] = useState(location?.state?.projectdata || { name: "My Project" });
  const params = useParams();
  const [projectData, setProjectData] = useState(location?.state?.projectdata || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useContext(UserContext);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [webContainer, setWebContainer] = useState(null);

  // --- File Tree States ---
  // const [fileTree, setFileTree] = useState({}); // Will be updated from Gemini response
    const [fileTree, setFileTree] = useState(location?.state?.fileTree || {});
  const [openFiles, setOpenFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [serverPort, setServerPort] = useState(3000);
  const [isIframeModalOpen, setIsIframeModalOpen] = useState(false); // New state for iframe modal

  const [aiStatus, setAiStatus] = useState(null);
  const { agentStatus, agentThoughts, stopGeneration } = useAIAgent(projectData?._id, webContainer, setMessages);

  // Yjs & Monaco refs
  const editorRef = useRef(null);
  const ydocRef = useRef(new Y.Doc());
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  
  // Terminal & Shell refs
  const terminalRef = useRef(null);
  const shellProcessRef = useRef(null);
  const inputWriterRef = useRef(null);
  const shellStartedRef = useRef(false);

  useEffect(() => {
    if (!projectData?._id) return;
    const wsUrl = import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/yjs';
    providerRef.current = new WebsocketProvider(wsUrl, projectData._id, ydocRef.current);
    
    return () => {
      providerRef.current?.destroy();
    };
  }, [projectData?._id]);

  const bindEditor = useCallback(() => {
    if (!editorRef.current || !currentFile) return;
    
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    
    const ytext = ydocRef.current.getText(currentFile);
    
    if (ytext.length === 0 && fileTreeRef.current[currentFile]?.file?.contents) {
      ytext.insert(0, fileTreeRef.current[currentFile].file.contents);
    }
    
    bindingRef.current = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      providerRef.current?.awareness
    );
  }, [currentFile]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    bindEditor();

    // Add Save Shortcut (Cmd+S / Ctrl+S) to seamlessly sync to WebContainer
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      console.log("Saving & syncing all files to WebContainer...");
      const latestFileTree = { ...fileTreeRef.current };
      
      Object.keys(latestFileTree).forEach(fileName => {
        const ytext = ydocRef.current.getText(fileName);
        if (ytext && ytext.length > 0) {
          latestFileTree[fileName] = {
            file: { contents: ytext.toString() }
          };
        }
      });
      
      setFileTree(latestFileTree);

      if (webContainer) {
        try {
          await webContainer.mount(buildWebContainerTree(latestFileTree));
          console.log("WebContainer file system synced successfully.");
        } catch (e) {
          console.error("Failed to sync to WebContainer:", e);
        }
      }
    });
  };

  const handleEditorBeforeMount = (monaco) => {
    monaco.editor.defineTheme('slate-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f172a',
        'editor.lineHighlightBackground': '#1e293b',
      }
    });
  };

  useEffect(() => {
    bindEditor();
  }, [bindEditor]);

  //  const [fileTree, setFileTree] = useState(location?.state?.fileTree || {});
  const fileTreeRef = useRef(fileTree);


  useEffect(() => {
    fileTreeRef.current = fileTree;
  }, [fileTree]);

   useEffect(() => {
    if (projectData) return;

    let id = params.projectId;
    if (!id) {
      const search = new URLSearchParams(location.search);
      id = search.get("id") || search.get("projectId");
    }
    if (!id) {
      const parts = location.pathname.split("/");
      if (parts.length > 2 && parts[2]) id = parts[2];
    }

    if (id) {
      axios
        .get(`/projects/get-project/${id}`)
        .then((res) => {
          setProjectData(res.data);
          if (res.data?.fileTree) {
            setFileTree(res.data.fileTree);
          }
        })
        .catch((err) => console.log(err));
    }
  }, [location, params, projectData]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getChats = () => {
     if (!projectData?._id) return;
    axios
      .post("chats/get-chat", { projectid: projectData._id })
      .then((res) => setMessages(res.data))
      .catch((err) => console.log(err));
  };

   useEffect(() => {
    const fetchProjectFileTree = async () => {
      try {
        const res = await axios.get(`/projects/get-project/${projectData._id}`);
        if (res.data?.fileTree) {
          setFileTree(res.data.fileTree);
          fileTreeRef.current = res.data.fileTree;
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchProjectFileTree();

    const handleBeforeUnload = () => {
      axios
        .put(`/projects/update-filetree/${projectData._id}`, { fileTree: fileTreeRef.current })
        .catch((err) => console.log(err));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);


  // Function to fetch users not in project
  const fetchUsersNotInProject = useCallback(() => {
     if (!projectData?._id) return;
    axios
      .get(`/users/usersnotinproject/${projectData._id}`)
      .then((res) => setUsers(res.data))
      .catch((err) => console.log(err));
  }, [projectData]);

  // Initialize socket, load chats, and fetch users
  useEffect(() => {
     if (!projectData?._id) return;
    initializeSocket({ projectId: projectData._id });
    if(!webContainer) {
      console.log("Initializing WebContainer...");
      getWebContainer().then(container => { 
        setWebContainer(container);
        console.log("WebContainer initialized:", container);
      });
    }
    scrollToBottom();
    getChats();
    fetchUsersNotInProject(); // Use the new function

    // Receive messages from socket
    receiveMessage("project-message", (data) => {
      try {
        const parsed = JSON.parse(data.message);
        // Update file tree if provided
        if (parsed.fileTree) {
          // Sync AI changes into Yjs Document so Monaco editor updates
          if (ydocRef.current) {
            const syncYjsRecursively = (tree, currentPath = "") => {
              Object.entries(tree).forEach(([key, node]) => {
                const nodePath = currentPath ? `${currentPath}/${key}` : key;
                if (node.file && node.file.contents !== undefined) {
                  const ytext = ydocRef.current.getText(nodePath);
                  const currentContent = ytext.toString();
                  const newContent = node.file.contents;
                  if (currentContent !== newContent) {
                    ytext.delete(0, ytext.length);
                    ytext.insert(0, newContent);
                  }
                } else if (node.directory) {
                  syncYjsRecursively(node.directory, nodePath);
                } else if (typeof node === 'object' && !node.file && !node.directory) {
                  // Fallback for flat structure where top keys are just files
                  syncYjsRecursively(node, nodePath);
                }
              });
            };
            syncYjsRecursively(parsed.fileTree);
          }

          setFileTree(parsed.fileTree);
          webContainer?.mount(buildWebContainerTree(parsed.fileTree)).catch(err => console.error("Mount error:", err));
        }
        // Add only the text portion as a chat message
        if (parsed.text) {
          const newChatMsg = {
            project: projectData._id,
            message: parsed.text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sender: data.sender || { email: "AI@ai.com" }
          };
          setMessages((prev) => [...prev, newChatMsg]);
        }
      } catch (err) {
        // Fallback for non-JSON messages (like regular chat messages)
        const newChatMsg = {
          project: projectData._id,
          message: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: data.sender || { email: "Unknown" }
        };
        setMessages((prev) => [...prev, newChatMsg]);
      }
      getChats();
    });

    receiveMessage("ai-status", (data) => {
      if (data.status === 'done') {
        setAiStatus(null);
      } else {
        setAiStatus(data);
      }
    });

  }, [fetchUsersNotInProject]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Open iframe modal when iframeUrl is set
  useEffect(() => {
    if (iframeUrl) {
      setIsIframeModalOpen(true);
    }
  }, [iframeUrl]);

  const handleUserSelection = () => {
     if (!projectData?._id) return;
    setIsModalOpen(false);
    if (selectedUsers.length === 0) return;
    
    axios
      .put("/projects/add-user", {
        projectid: projectData._id,
        users: selectedUsers,
      })
      .then(() => {
        // Update project data
        axios.get(`/projects/get-project/${projectData._id}`).then((res) => {
          setProjectData(res.data);
        });
        
        // Refresh the list of users not in project
        fetchUsersNotInProject();
        
        // Clear selected users
        setSelectedUsers([]);
      })
      .catch((err) => console.log(err));
  };

  const handleSendMessage = (submittedText) => {
    if (!projectData?._id) return;
    const textToSend = typeof submittedText === "string" && submittedText.trim() ? submittedText : message;
    if (textToSend && textToSend.trim()) {
      const newMessage = {
        project: projectData._id,
        message: textToSend.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      axios
        .post("/chats/add-chat", newMessage)
        .then(() => {
          axios
            .post("chats/get-chat", { projectid: projectData._id })
            .then((res) => {
              setMessages(res.data);
              sendMessage("project-message", newMessage);
            })
            .catch((err) => console.log(err));
        })
        .catch((err) => console.log(err));
      setMessage("");
    }
  };

  const handleDeleteMessage = (messageId) => {
    axios
      .delete("/chats/delete-chat", { data: { id: messageId } })
      .then(() => {
        getChats();
      })
      .catch((err) => console.log(err));
  };

  const handleEditMessage = (messageId, newContent) => {
    axios
      .put("/chats/edit-chat", { id: messageId, message: newContent })
      .then(() => {
        getChats();
      })
      .catch((err) => console.log(err));
  };

  // --- File Tree Helper Functions ---
  const handleFileSelect = (fileName) => {
    if (!openFiles.includes(fileName)) {
      setOpenFiles((prev) => [...prev, fileName]);
    }
    setCurrentFile(fileName);
  };

  const handleDeleteFileTab = (fileName) => {
    const idx = openFiles.indexOf(fileName);
    if (idx !== -1) {
      setOpenFiles((prev) => prev.filter((f) => f !== fileName));
      if (openFiles.length > 1) {
        const nextFileIdx = idx === openFiles.length - 1 ? idx - 1 : idx;
        setCurrentFile(openFiles[nextFileIdx]);
      } else {
        setCurrentFile(null);
      }
    }
  };

  const handleFileContentUpdate = useCallback(
    (e) => {
      const updatedContent = e.target.innerText;
      if (currentFile && fileTree[currentFile]?.file.contents !== updatedContent) {
        setFileTree((prevTree) => ({
          ...prevTree,
          [currentFile]: {
            file: { contents: updatedContent },
          },
        }));
      }
    },
    [currentFile, fileTree]
  );

  useEffect(() => {
    if (webContainer && terminalRef.current?.getTerminal() && !shellStartedRef.current) {
      startShell(terminalRef.current.getTerminal());
    }
  }, [webContainer]);

  const startShell = useCallback(async (term) => {
    if (shellStartedRef.current || !webContainer) return;
    shellStartedRef.current = true;
    
    try {
      const latestFileTree = { ...fileTreeRef.current };
      Object.keys(latestFileTree).forEach(fileName => {
        const ytext = ydocRef.current.getText(fileName);
        if (ytext && ytext.length > 0) {
          latestFileTree[fileName] = {
            file: { contents: ytext.toString() }
          };
        }
      });
      
      if (Object.keys(latestFileTree).length > 0) {
        await webContainer.mount(buildWebContainerTree(latestFileTree));
      }

      const shellProcess = await webContainer.spawn('jsh');
      shellProcessRef.current = shellProcess;

      shellProcess.output.pipeTo(new WritableStream({
        write(data) {
          term.write(data);
        }
      }));

      const input = shellProcess.input.getWriter();
      inputWriterRef.current = input;
      
      term.onData((data) => {
        input.write(data);
      });
    } catch (error) {
      console.error("Failed to start shell:", error);
      shellStartedRef.current = false;
    }
  }, [webContainer]);

  // Handle Run Code functionality
  const handleRunCode = async () => {
    console.log("Running code...");
    
    // Sync latest content from Yjs into fileTree before running
    const latestFileTree = { ...fileTreeRef.current };
    Object.keys(latestFileTree).forEach(fileName => {
      const ytext = ydocRef.current.getText(fileName);
      if (ytext && ytext.length > 0) {
        latestFileTree[fileName] = {
          file: { contents: ytext.toString() }
        };
      }
    });
    setFileTree(latestFileTree);

    if (latestFileTree) {
      await webContainer?.mount(buildWebContainerTree(latestFileTree));
    }

    // Register event listener before starting processes to avoid missing events
    webContainer.on('server-ready', (port, url) => {
      setIframeUrl(url);
      setServerPort(port);
      console.log(`Server is ready at ${url}, port: ${port}`);
    });

    if (inputWriterRef.current) {
      // Send Ctrl+C to safely terminate any currently running server
      await inputWriterRef.current.write('\x03');
      // Brief delay to allow process to exit
      await new Promise(resolve => setTimeout(resolve, 500));
      // Use npm run dev if possible for nodemon auto-restart, fallback to start
      await inputWriterRef.current.write('npm install && (npm run dev || npm start)\r');
    } else {
      console.warn("Terminal shell is not ready yet.");
    }
  };

  // Handle closing iframe modal
  const handleCloseIframeModal = () => {
    setIsIframeModalOpen(false);
    // Optionally reset iframeUrl if you want to clear it
    // setIframeUrl(null);
  };

  // Handle URL change from iframe modal
  const handleIframeUrlChange = (newUrl) => {
    setIframeUrl(newUrl);
  };

  // --- End File Tree Functions ---

  const placeholders = [
    "Type your message here...",
    "Share your thoughts...",
    "Ask a question...",
    "Enter your response...",
  ];

  return (
    <div className="font-inter h-screen w-full bg-[#0B172A] select-none overflow-hidden text-slate-300 flex">
      <PanelGroup orientation="horizontal" autoSaveId="main-layout">
        
        {/* LEFT SIDEBAR (Explorer) */}
        <Panel defaultSize={15} minSize={10} className="flex flex-col p-1">
          <div className="flex-1 bg-slate-800/80 rounded-xl border border-slate-700/50 flex flex-col overflow-hidden shadow-lg">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Explorer</div>
              <button 
                onClick={() => {
                  const fileName = prompt("Enter new file name (e.g., .env):");
                  if (fileName) {
                    setFileTree(prev => ({
                      ...prev,
                      [fileName]: { file: { contents: "" } }
                    }));
                  }
                }}
                className="text-slate-400 hover:text-cyan-400 transition-colors"
                title="New File"
              >
                <TbFile size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {Object.keys(fileTree).length > 0 ? (
                Object.entries(buildWebContainerTree(fileTree)).map(([name, node]) => (
                  <FileTreeNode
                    key={name}
                    name={name}
                    node={node}
                    currentPath={name}
                    currentFile={currentFile}
                    onSelect={handleFileSelect}
                  />
                ))
              ) : (
                <div className="text-slate-500 text-sm mt-4 text-center">No files available</div>
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 flex items-center justify-center cursor-col-resize z-10 group">
          <div className="h-12 w-1 rounded-full bg-slate-700 group-hover:bg-cyan-500/50 transition-colors" />
        </PanelResizeHandle>

        {/* MIDDLE WORKSPACE (Editor + Terminal) */}
        <Panel defaultSize={60} minSize={30} className="flex flex-col p-1">
          <PanelGroup orientation="vertical">
            
            {/* Editor Top */}
            <Panel defaultSize={70} minSize={30} className="flex flex-col pb-1">
              <div className="flex-1 bg-slate-800/80 rounded-xl border border-slate-700/50 flex flex-col overflow-hidden shadow-lg relative">
                {/* Tab Bar with Run Button */}
                <div className="flex items-center justify-between bg-slate-800/50 h-11 border-b border-slate-700/50 overflow-hidden">
                  <div className="flex h-full overflow-x-auto custom-scrollbar flex-1">
                    {openFiles.map((file, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center space-x-2 px-4 h-full min-w-max text-sm cursor-pointer border-r border-slate-700/50 transition-colors ${
                          currentFile === file 
                            ? 'bg-slate-800/80 text-cyan-300 border-t-2 border-t-cyan-500 shadow-inner' 
                            : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border-t-2 border-t-transparent'
                        }`}
                        onClick={() => setCurrentFile(file)}
                      >
                        {getFileIcon(file)}
                        <span className="font-medium tracking-wide">{file.split('/').pop()}</span>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFileTab(file);
                        }}>
                          <TbX size={14} className="hover:text-red-400 cursor-pointer ml-2 opacity-70 hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 px-4 h-full border-l border-slate-700/50 bg-slate-800/50">
                    <button 
                      onClick={() => setIsIframeModalOpen(true)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors shadow-md ${iframeUrl ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                      title={iframeUrl ? "Open Browser Preview" : "Run code first to open browser"}
                      disabled={!iframeUrl}
                    >
                      <TbBrowser size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Browser</span>
                    </button>
                    <button 
                      onClick={handleRunCode}
                      className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-md transition-colors shadow-md"
                      title="Run Project"
                    >
                      <TbPlayerPlay size={16} className="fill-current" />
                      <span className="text-xs font-bold uppercase tracking-wider">Run</span>
                    </button>
                  </div>
                </div>
                
                {/* Monaco Editor */}
                <div className="flex-1 bg-slate-900 overflow-hidden">
                  {currentFile ? (
                    <MonacoEditor
                      height="100%"
                      path={currentFile}
                      defaultLanguage={currentFile.endsWith(".html") ? "html" : currentFile.endsWith(".css") ? "css" : currentFile.endsWith(".json") ? "json" : currentFile.endsWith(".md") ? "markdown" : "javascript"}
                      theme="slate-theme"
                      beforeMount={handleEditorBeforeMount}
                      onMount={handleEditorMount}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        padding: { top: 16 }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="text-center">
                        <DiReact size={56} className="mx-auto mb-3 text-slate-600 opacity-50" />
                        <div className="font-medium tracking-wide">Select a file to edit</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="h-2 flex items-center justify-center cursor-row-resize z-10 group">
              <div className="w-8 h-1 rounded-full bg-slate-700 group-hover:bg-cyan-500/50 transition-colors" />
            </PanelResizeHandle>

            {/* Terminal Bottom */}
            <Panel defaultSize={30} minSize={10} className="flex flex-col pt-1">
              <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700/50 flex flex-col overflow-hidden shadow-lg">
                <div className="h-9 flex items-center px-4 bg-slate-800/80 border-b border-slate-700/50 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Terminal
                </div>
                <div className="flex-1 overflow-hidden p-2">
                  <Terminal ref={terminalRef} onTerminalReady={(term) => {
                    if (webContainer && !shellStartedRef.current) startShell(term);
                  }} />
                </div>
              </div>
            </Panel>
            
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-2 flex items-center justify-center cursor-col-resize z-10 group">
          <div className="h-12 w-1 rounded-full bg-slate-700 group-hover:bg-cyan-500/50 transition-colors" />
        </PanelResizeHandle>

        {/* RIGHT SIDEBAR (Chat) */}
        <Panel defaultSize={25} minSize={15} className="flex flex-col p-1">
          <div className="flex-1 bg-slate-800/80 rounded-xl border border-slate-700/50 flex flex-col overflow-hidden shadow-lg relative">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Chat</div>
              <span className="flex space-x-3">
                <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                  <TbUsers size={18} />
                </button>
                <button onClick={() => setIsModalOpen(true)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                  <TbUsersPlus size={18} />
                </button>
              </span>
              
              <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
                <div className="text-sm font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Project Members</div>
                <div className="space-y-2">
                  {projectData?.users?.map((usr, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 hover:bg-slate-700/50 rounded-md transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {usr.firstname[0]}
                      </div>
                      <div>
                        <div className="text-slate-300 text-sm font-medium">{usr.firstname}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Sidebar>
            </div>
            
            <Chat
              messages={messages}
              user={user}
              agentStatus={agentStatus}
              agentThoughts={agentThoughts}
              stopGeneration={stopGeneration}
              message={message}
              setMessage={setMessage}
              handleSendMessage={handleSendMessage}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              handleDeleteMessage={handleDeleteMessage}
              handleEditMessage={handleEditMessage}
            />
          </div>
        </Panel>

      </PanelGroup>

      {/* Users Modal */}
      <UserSelectionModal
        isOpen={isModalOpen}
        onClose={handleUserSelection}
        users={users}
        selectedUsers={selectedUsers}
        setSelectedUsers={setSelectedUsers}
      />

      {/* Browser Preview Modal */}
      <BrowserPreview
        isOpen={isIframeModalOpen}
        onClose={handleCloseIframeModal}
        actualUrl={iframeUrl}
        port={serverPort}
      />

      {/* Custom Scrollbar Styles */}
      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(71, 85, 105, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(71, 85, 105, 0.8);
        }
      `}</style>
    </div>
  );
};

export default Editor;
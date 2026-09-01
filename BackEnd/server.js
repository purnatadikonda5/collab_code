console.log("STARTING SERVER.JS");
import http from 'http'
import app from './app.js'
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose';
import project_model from './db/models/project_model.js';
import Chat from './db/models/chat_model.js';
import { generateResult } from './services/ai.services.js';
import { WebSocketServer } from 'ws';
import { setupWSConnection, setPersistence, docs, getYDoc } from 'y-websocket/bin/utils';
import { MongodbPersistence } from 'y-mongodb-provider';
import * as Y from 'yjs';

const PORT=process.env.PORT || 3000;
// to create the socket server we need the raw http server not the express app
// so we create a server using http.createServer and pass the express app to it
// then we create a socket server using the raw http server and pass the express
const server=http.createServer(app);
const io= new Server(server,{cors: {
        origin: '*'
    }});
// what is this use function doing?
// it is a middleware function that runs before the connection event
// it is used to authenticate the user and get the project id from the socket handshake
// if the user is not authenticated or the project id is not valid, it will throw an error
// otherwise it will attach the user and project to the socket object

 // wen will this happen ? // when the user connects to the socket server
io.use(async (socket,next)=>{
    try {
        let token= socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        let projectId= socket.handshake.query.projectId;
        if(!mongoose.Types.ObjectId.isValid(projectId)){
            throw new Error("Invalid ProjectId");
        }
        if(!token){
            throw new Error("Authentication User");
        }
        socket.project= await project_model.findById(projectId);
        let decoded= jwt.verify(token,process.env.JWT_SECRET);
        if(!decoded){
            throw new Error("Authentication User");
        }
        socket.user=decoded
        next();
    } catch (error) {
        next(error);
    }
})
io.on('connection',socket=>{
    // console.log("a user connected");
    socket.roomId= socket.project._id.toString();
    socket.join(socket.roomId);
    // an event is listened from frontend
    // when a user sends a message in the project chat
    // we will emit the message to all the users in the project room
    socket.on('project-message',async (data)=>{
        console.log(`[Socket] Received project-message from ${socket.roomId}:`, data.message);
        const message= data.message;
        io.to(socket.roomId).emit('project-message',data);

        // --- Slash Command: /clearTheCode ---
        if (message.trim().startsWith('/clearTheCode')) {
            const ydoc = getYDoc('yjs/' + socket.roomId);
            
            // 1. Clear Yjs document (delete all file contents)
            for (const key of ydoc.share.keys()) {
                const ytext = ydoc.getText(key);
                if (ytext && ytext.length > 0) {
                    ytext.delete(0, ytext.length);
                }
            }

            import('./services/codeIndexer.js').then(async ({ clearProjectVectorStore }) => {
                await clearProjectVectorStore(socket.roomId);
                
                // 2. Clear MongoDB project fileTree
                await project_model.findByIdAndUpdate(socket.roomId, { fileTree: {} });

                const text = "🧹 **Project Cleared Successfully!** All project files and cached vector embeddings have been deleted.";
                
                // Save to MongoDB Chat model
                await Chat.create({
                    email: 'AI@ai.com',
                    sender: '67d7da39b9b904cb0ad30971',
                    project: socket.roomId,
                    message: text,
                });

                // 3. Emit project-message with fileTree: {} inside message so UI updates instantly
                io.to(socket.roomId).emit('project-message', {
                    message: JSON.stringify({ text, fileTree: {} }),
                    sender: {
                        _id: '67d7da39b9b904cb0ad30971',
                        email: 'AI@ai.com'
                    }
                });
            });
            return;
        }

        // --- Slash Command: /ExplainTheCode ---
        if (message.trim().startsWith('/ExplainTheCode')) {
            const topic = message.trim().replace('/ExplainTheCode', '').trim() || "Overview of Project Architecture";
            const prompt = `Create a markdown document named EXPLAIN_${topic.replace(/\s+/g, '_').toUpperCase()}.md explaining the topic: "${topic}". Use read_file, search_code, or list_directory to inspect the project code first, then use write_file to create the file in the workspace root.`;
            const ydoc = getYDoc('yjs/' + socket.roomId);

            import('./services/agentRunner.js').then(async ({ runAgent }) => {
                const finalAnswer = await runAgent(socket.roomId, prompt, ydoc, io, socket.id);
                let newmessage = {
                    email: 'AI@ai.com',
                    sender: '67d7da39b9b904cb0ad30971',
                    project: socket.roomId,
                    message: finalAnswer,
                };
                await Chat.create(newmessage);
                io.to(socket.roomId).emit('project-message', {
                    message: JSON.stringify({ text: finalAnswer }),
                    sender: { _id: '67d7da39b9b904cb0ad30971', email: 'AI@ai.com' }
                });
            });
            return;
        }

        const isAiPresent = message.includes('@ai');
        if(isAiPresent){
            // Extract the user prompt
            const prompt = message.replace('@ai', '').trim();
            
            // Get or create the live Y.Doc for this project room
            const ydoc = getYDoc('yjs/' + socket.roomId);

            // Run the LangChain Agent Loop
            import('./services/agentRunner.js').then(async ({ runAgent }) => {
                const finalAnswer = await runAgent(socket.roomId, prompt, ydoc, io, socket.id);
                
                // Save AI response to MongoDB chat history
                let newmessage = {
                    email: 'AI@ai.com',
                    sender: '67d7da39b9b904cb0ad30971',
                    project: socket.roomId,
                    message: finalAnswer,
                };
                await Chat.create(newmessage);

                // Emit project-message so current Chat UI updates automatically
                const aiResponseJson = JSON.stringify({ text: finalAnswer });
                io.to(socket.roomId).emit('project-message', {
                    message: aiResponseJson,
                    sender: {
                        _id: '67d7da39b9b904cb0ad30971',
                        email: 'AI@ai.com'
                    }
                });
            }).catch(err => {
                console.error("Agent failed:", err);
                io.to(socket.roomId).emit('agent:error', { message: err.message });
            });

            return;
        }
    })
    // socket.on('',()=>{});
    socket.on('disconnect',()=>{
        console.log("User disconnected");
        socket.leave(socket.roomId);
    });
})
// --- Yjs WebSocket Server & MongoDB Write-Behind Persistence ---
const mdb = new MongodbPersistence(process.env.MONGODB_URI, {
  collectionName: 'yjs-transactions',
  flushSize: 100,
  multipleCollections: false
});

// Write-behind caching: buffer rapid updates in RAM, merge & flush periodically
const updateBuffers = new Map();   // Map<docName, Uint8Array[]>
const debounceTimers = new Map();  // Map<docName, { debounce: Timeout, maxWait: Timeout }>
const DEBOUNCE_MS = 60000;         // Flush after 1 minute of inactivity
const MAX_WAIT_MS = 300000;        // Force-flush ceiling every 5 minutes during sustained edits

/**
 * Merges all buffered binary updates for a document into one
 * and writes a single compressed update to MongoDB.
 */
const flushUpdates = async (docName) => {
  const buffer = updateBuffers.get(docName);
  if (!buffer || buffer.length === 0) return;

  // Extract & clear atomically
  updateBuffers.delete(docName);
  const timers = debounceTimers.get(docName);
  if (timers) {
    clearTimeout(timers.debounce);
    clearTimeout(timers.maxWait);
    debounceTimers.delete(docName);
  }

  try {
    const mergedUpdate = Y.mergeUpdates(buffer);
    await mdb.storeUpdate(docName, mergedUpdate);
    console.log(`[Yjs Persistence] Flushed ${buffer.length} updates for "${docName}" (${mergedUpdate.byteLength} bytes)`);
  } catch (err) {
    console.error(`[Yjs Persistence] Flush failed for "${docName}":`, err);
  }
};

/**
 * Flushes all pending document buffers. Used during graceful shutdown.
 */
const flushAllUpdates = async () => {
  const docNames = Array.from(updateBuffers.keys());
  if (docNames.length === 0) return;
  console.log(`[Yjs Persistence] Flushing ${docNames.length} pending document buffers...`);
  await Promise.allSettled(docNames.map(flushUpdates));
  console.log(`[Yjs Persistence] All buffers flushed.`);
};

setPersistence({
  bindState: async (docName, ydoc) => {
    // Hydrate: load persisted state from MongoDB into the live doc
    const persistedYdoc = await mdb.getYDoc(docName);
    const newUpdates = Y.encodeStateAsUpdate(ydoc);
    await mdb.storeUpdate(docName, newUpdates);  // One-time: persist any pre-existing state
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));

    // Debounced update handler — buffers writes instead of hitting MongoDB per-keystroke
    ydoc.on('update', (update) => {
      // 1. Push to buffer
      if (!updateBuffers.has(docName)) {
        updateBuffers.set(docName, []);
      }
      updateBuffers.get(docName).push(update);

      // 2. Reset the 60s idle debounce timer
      const existing = debounceTimers.get(docName);
      if (existing?.debounce) {
        clearTimeout(existing.debounce);
      }

      const newDebounce = setTimeout(() => flushUpdates(docName), DEBOUNCE_MS);

      // 3. Set the 5-minute maxWait ceiling (only once per burst cycle)
      const maxWait = existing?.maxWait || setTimeout(() => flushUpdates(docName), MAX_WAIT_MS);

      debounceTimers.set(docName, { debounce: newDebounce, maxWait });
    });
  },

  writeState: async (docName, ydoc) => {
    // Called when all WebSocket clients disconnect and the doc is about to be destroyed.
    // Flush any remaining buffered updates to prevent data loss.
    await flushUpdates(docName);
  }
});

// Graceful shutdown: flush all pending buffers before process exits
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Flushing Yjs persistence buffers...`);
  await flushAllUpdates();
  process.exit(0);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', setupWSConnection);

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  // If the request is for yjs (e.g., /yjs/roomId)
  if (pathname.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

server.listen(PORT,()=>{
    console.log("LISTENING ON PORT : ",PORT);
})
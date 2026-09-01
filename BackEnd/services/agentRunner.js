import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgentTools } from "../tools/agentTools.js";
import project_model from '../db/models/project_model.js';

// In-memory rolling conversation store per project
// Shape: { [projectId]: BaseMessage[] }
const projectMemory = {};
const MAX_MEMORY_MESSAGES = 10;

const SYSTEM_PROMPT = `You are CollabCode's elite AI pair programmer. You have access to tools to read, edit, create files, and interact with the terminal.

STRICT TOOL POLICIES:
1. CODE CREATION & EDITING:
   - When the user asks to create, modify, or refactor code, ONLY use file-related tools (\`edit_file\`, \`write_file\`, \`search_code\`, \`read_file\`).
   - Batch all file creations/edits in parallel within the same step whenever possible.
   - DO NOT automatically run verification commands, syntax checks, or terminal commands unless the user explicitly tells you to run or test the code.
   - Once the files are written/edited, report your changes and finish.

2. TERMINAL COMMANDS (ON-DEMAND ONLY):
   - ONLY call \`run_terminal_command\` when the user explicitly asks you to run, start, test, execute, or check terminal output (e.g., "run the server", "run tests", "check if npm install works").
   - Never run blocking/persistent server commands (e.g., 'node server.js', 'npm start') that do not exit on their own. Use non-blocking commands or test runners.
   - If the user asks to run something that requires missing files (e.g., running npm without package.json), inform the user instead of triggering a failing command.`;

import { getGeminiPool } from "./geminiPool.js";

/**
 * Initializes and executes the LangGraph agent reasoning loop for a specific project workspace.
 * 
 * @param {string} projectId - The ID of the project being edited
 * @param {string} userInput - The query or instruction from the user
 * @param {import('yjs').Doc} ydoc - The shared Yjs document for the project
 * @param {import('socket.io').Server} io - The Socket.IO server instance
 */
export const runAgent = async (projectId, userInput, ydoc, io, socketId = null) => {
  // 1. Initialize Tools bound to this workspace
  const tools = createAgentTools(projectId, ydoc, io, socketId);

  // 2. Initialize the LLM
  const llm = getGeminiPool();
  
  // 3. Create the LangGraph ReAct Agent
  const agent = createReactAgent({
    llm,
    tools,
    stateModifier: new SystemMessage(SYSTEM_PROMPT),
  });

  // 4. Initialize or Retrieve Conversational Memory
  if (!projectMemory[projectId]) {
    projectMemory[projectId] = [];
  }
  let chatHistory = projectMemory[projectId];

  // 5. Build input messages
  const inputMessages = [
    ...chatHistory,
    new HumanMessage(userInput),
  ];

  // 6. Execute and Stream Lifecycle Events via Socket.IO
  try {
    let finalAnswer = "";

    // Use streamEvents to hook into LangGraph's internal emission system
    const eventStream = agent.streamEvents(
      { messages: inputMessages },
      { version: "v2", recursionLimit: 25 }
    );

    for await (const event of eventStream) {
      const kind = event.event;
      console.log(`[Stream Event] ${kind} - ${event.name}`);

      if (kind === "on_chat_model_stream") {
        const chunk = event.data?.chunk;
        if (chunk && chunk.content && typeof chunk.content === "string") {
          io.to(projectId).emit("agent:thought", { thought: chunk.content });
          finalAnswer += chunk.content;
        }
      } 
      else if (kind === "on_tool_start") {
        io.to(projectId).emit("agent:tool_call", { 
          tool: event.name, 
          arguments: event.data?.input 
        });
      } 
      else if (kind === "on_tool_end") {
        io.to(projectId).emit("agent:tool_result", {
          tool: event.name,
          result: typeof event.data?.output === "string" 
            ? event.data.output.substring(0, 500) 
            : "Tool completed."
        });
      }
    }

    // If streamEvents didn't capture the final answer from chunks,
    // invoke the agent normally to get it
    if (!finalAnswer) {
      const result = await agent.invoke({ messages: inputMessages }, { recursionLimit: 25 });
      const lastMsg = result.messages[result.messages.length - 1];
      finalAnswer = lastMsg?.content || "Agent completed without a text response.";
    }

    // 7. Emit Final Output
    io.to(projectId).emit("agent:final_answer", { answer: finalAnswer });

    // 7.5. Sync Yjs doc state → MongoDB fileTree + broadcast to UI
    try {
      const fileTree = {};
      for (const key of ydoc.share.keys()) {
        const content = ydoc.getText(key).toString();
        if (content.length > 0) {
          fileTree[key] = { file: { contents: content } };
        }
      }

      // Persist to MongoDB
      await project_model.findByIdAndUpdate(projectId, { fileTree });

      // Broadcast to frontend so Explorer sidebar updates
      io.to(projectId).emit('project-message', {
        message: JSON.stringify({ fileTree }),
        sender: { _id: '67d7da39b9b904cb0ad30971', email: 'AI@ai.com' }
      });

      console.log(`[Agent] Synced fileTree to MongoDB (${Object.keys(fileTree).length} files)`);
    } catch (syncErr) {
      console.error('[Agent] fileTree sync failed:', syncErr.message);
    }

    // 8. Update Memory and Apply Sliding Window Truncation
    chatHistory.push(new HumanMessage(userInput));
    chatHistory.push(new AIMessage(finalAnswer));

    if (chatHistory.length > MAX_MEMORY_MESSAGES) {
      chatHistory = chatHistory.slice(chatHistory.length - MAX_MEMORY_MESSAGES);
    }
    
    projectMemory[projectId] = chatHistory;

    return finalAnswer;

  } catch (err) {
    console.error("Agent Execution Error:", err);
    let fallbackMessage = `Agent encountered a critical reasoning failure: ${err.message}`;
    if (err.message && err.message.includes("429 Too Many Requests")) {
        fallbackMessage = "I am currently processing too many requests and hit the free tier rate limit. Please wait 15-30 seconds and try your request again.";
    }
    io.to(projectId).emit("agent:error", { message: fallbackMessage });
    return fallbackMessage;
  }
};

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { searchProjectCode } from "../services/codeIndexer.js";
import * as Y from "yjs";

// Helper: Normalize file paths (removes leading/trailing slashes, redundant './')
const normalizePath = (p) => p ? p.replace(/^(\.\/|\/)+/, "").replace(/\/+$/, "").trim() : "";

// Helper: Truncate output to prevent context window blowouts
const truncateOutput = (str, maxChars = 8000) => {
  if (!str || str.length <= maxChars) return str;
  return `${str.slice(0, maxChars)}\n\n... [Output truncated: exceeded ${maxChars} characters]`;
};

export const createAgentTools = (projectId, ydoc, io, userSocketId) => {

  // 1. SEMANTIC & VECTOR CODE SEARCH
  const search_code = tool(
    async ({ query, maxResults = 5 }) => {
      try {
        const results = await searchProjectCode(projectId, query, Math.min(maxResults, 10));
        if (!results || results.length === 0) {
          return "No semantically relevant code found in the project vector index.";
        }
        const formatted = results
          .map((r, i) => `[Result ${i + 1}] File: ${r.metadata?.filePath || "unknown"} (Lines ${r.metadata?.startLine || 1}-${r.metadata?.endLine || "?"})\n${r.pageContent}`)
          .join("\n\n" + "-".repeat(40) + "\n\n");
        return truncateOutput(formatted, 6000);
      } catch (err) {
        return `Search error: ${err.message}`;
      }
    },
    {
      name: "search_code",
      description: "Perform semantic vector search across the project codebase to locate functions, logic, imports, or architectural patterns.",
      schema: z.object({
        query: z.string().describe("The semantic search query or code concept to find"),
        maxResults: z.number().optional().describe("Number of code chunks to return (default: 5, max: 10)"),
      }),
    }
  );

  // 2. CURSOR-STYLE DIRECTORY INSPECTION
  const list_directory = tool(
    async ({ directoryPath = "." }) => {
      try {
        const cleanDir = normalizePath(directoryPath);
        const allKeys = Array.from(ydoc.share.keys()).map(normalizePath);
        
        const activeFiles = allKeys.filter(path => {
          const content = ydoc.getText(path).toString();
          return content.length > 0 || path.endsWith("/.keep");
        });

        const prefix = cleanDir === "" || cleanDir === "." ? "" : `${cleanDir}/`;
        const matchingEntries = activeFiles.filter(p => prefix === "" || p.startsWith(prefix));

        if (matchingEntries.length === 0) {
          return `Directory '${directoryPath}' is empty or does not exist.`;
        }

        const folders = new Set();
        const files = new Set();

        matchingEntries.forEach(fullPath => {
          const relativePath = prefix ? fullPath.slice(prefix.length) : fullPath;
          const segments = relativePath.split("/");
          if (segments.length > 1) {
            folders.add(segments[0]); // Immediate subfolder
          } else if (!segments[0].endsWith(".keep")) {
            files.add(segments[0]); // Immediate file
          }
        });

        const output = [
          `Directory: ${cleanDir || "/"}`,
          `Folders (${folders.size}): ${Array.from(folders).map(f => `${f}/`).join(", ") || "none"}`,
          `Files (${files.size}): ${Array.from(files).join(", ") || "none"}`
        ].join("\n");

        return output;
      } catch (err) {
        return `Error listing directory: ${err.message}`;
      }
    },
    {
      name: "list_directory",
      description: "List immediate subfolders and files inside a directory to navigate the project structure cleanly.",
      schema: z.object({
        directoryPath: z.string().optional().describe("Directory path to inspect (use '.' or '' for root)"),
      }),
    }
  );

  // 3. NUMBERED & RANGE-PROTECTED FILE READER
  const read_file = tool(
    async ({ filePath, startLine = 1, endLine }) => {
      try {
        const cleanPath = normalizePath(filePath);
        const content = ydoc.getText(cleanPath).toString();

        if (!content) {
          return `Error: File '${cleanPath}' does not exist or is completely empty.`;
        }

        const lines = content.split("\n");
        const totalLines = lines.length;

        const start = Math.max(1, startLine);
        const end = endLine ? Math.min(totalLines, endLine) : totalLines;

        if (start > totalLines || start > end) {
          return `Error: Invalid line range (${start}-${end}). File has ${totalLines} lines.`;
        }

        const formattedLines = lines
          .slice(start - 1, end)
          .map((line, idx) => `${start + idx} | ${line}`)
          .join("\n");

        return `[File: ${cleanPath} | Total Lines: ${totalLines} | Displaying: ${start}-${end}]\n${truncateOutput(formattedLines, 10000)}`;
      } catch (err) {
        return `Error reading file: ${err.message}`;
      }
    },
    {
      name: "read_file",
      description: "Read file contents with 1-indexed line numbers. Supports reading specific line ranges to conserve token budget.",
      schema: z.object({
        filePath: z.string().describe("Target file path to read"),
        startLine: z.number().optional().describe("Starting line number (1-indexed, default: 1)"),
        endLine: z.number().optional().describe("Ending line number (1-indexed, inclusive)"),
      }),
    }
  );

  // 4. CREATE EMPTY DIRECTORY
  const create_directory = tool(
    async ({ directoryPath }) => {
      try {
        const cleanDir = normalizePath(directoryPath);
        if (!cleanDir || cleanDir === ".") return "Error: Cannot create root directory.";

        const markerPath = `${cleanDir}/.keep`;
        const ytext = ydoc.getText(markerPath);
        
        // Write a minimal directory placeholder marker
        if (ytext.toString().length === 0) {
          ytext.insert(0, "");
        }

        return `Successfully initialized directory '${cleanDir}/'.`;
      } catch (err) {
        return `Error creating directory: ${err.message}`;
      }
    },
    {
      name: "create_directory",
      description: "Create a new folder or directory path in the workspace.",
      schema: z.object({
        directoryPath: z.string().describe("The folder path to initialize (e.g., 'src/controllers')"),
      }),
    }
  );

  // 5. ATOMIC FILE CREATION (WRITE FILE)
  const write_file = tool(
    async ({ filePath, content, overwrite = true }) => {
      try {
        const cleanPath = normalizePath(filePath);
        const ytext = ydoc.getText(cleanPath);
        const currentLength = ytext.toString().length;

        if (currentLength > 0 && !overwrite) {
          return `Refused to overwrite existing file '${cleanPath}'. Set overwrite=true or use edit_file.`;
        }

        if (currentLength > 0) {
          ytext.delete(0, currentLength);
        }
        ytext.insert(0, content);

        return `Successfully wrote ${content.length} characters to '${cleanPath}'.`;
      } catch (err) {
        return `Error writing file: ${err.message}`;
      }
    },
    {
      name: "write_file",
      description: "Create a new file or completely overwrite an existing file. Automatically ensures parent directories exist.",
      schema: z.object({
        filePath: z.string().describe("Target file path (e.g., 'src/index.js')"),
        content: z.string().describe("Complete raw file contents"),
        overwrite: z.boolean().optional().describe("Allow overwriting existing files (default: true)"),
      }),
    }
  );

  // 6. CLAUDE CODE STYLE SURGICAL STRING & LINE REPLACER
  const edit_file = tool(
    async ({ filePath, oldString, newString, startLine, endLine }) => {
      try {
        const cleanPath = normalizePath(filePath);
        const ytext = ydoc.getText(cleanPath);
        const content = ytext.toString();

        if (!content) {
          return `Error: File '${cleanPath}' is empty or does not exist. Use write_file instead.`;
        }

        // STRATEGY A: Line-Range Replacement (Explicit line numbers provided)
        if (startLine !== undefined && endLine !== undefined) {
          const lines = content.split("\n");
          if (startLine < 1 || endLine > lines.length || startLine > endLine) {
            return `Error: Invalid line range (${startLine}-${endLine}). File length: ${lines.length}.`;
          }

          let startIndex = 0;
          for (let i = 0; i < startLine - 1; i++) startIndex += lines[i].length + 1;

          let endIndex = startIndex;
          for (let i = startLine - 1; i < endLine; i++) endIndex += lines[i].length + 1;
          endIndex = Math.min(endIndex - 1, content.length);
          if (endLine === lines.length) endIndex = content.length;

          ytext.delete(startIndex, endIndex - startIndex);
          ytext.insert(startIndex, newString);
          return `Successfully replaced lines ${startLine}-${endLine} in '${cleanPath}'.`;
        }

        // STRATEGY B: Exact String Matching (Claude Code / Cursor str_replace pattern)
        if (!oldString) {
          return "Error: You must provide either 'oldString' or both 'startLine' and 'endLine'.";
        }

        const occurrences = content.split(oldString).length - 1;

        if (occurrences === 0) {
          // Attempt whitespace-normalized fallback search
          const normContent = content.replace(/\r\n/g, "\n");
          const normOld = oldString.replace(/\r\n/g, "\n");
          const normIndex = normContent.indexOf(normOld);

          if (normIndex === -1) {
            return `Error: 'oldString' not found in '${cleanPath}'. Ensure exact indentation and characters match.`;
          }

          ytext.delete(normIndex, normOld.length);
          ytext.insert(normIndex, newString);
          return `Successfully replaced matched block in '${cleanPath}' using normalized spacing.`;
        }

        if (occurrences > 1) {
          return `Error: 'oldString' matches ${occurrences} locations in '${cleanPath}'. Provide a larger, unique code block or use line numbers.`;
        }

        const matchIndex = content.indexOf(oldString);
        ytext.delete(matchIndex, oldString.length);
        ytext.insert(matchIndex, newString);

        return `Successfully edited '${cleanPath}'.`;
      } catch (err) {
        return `Error editing file: ${err.message}`;
      }
    },
    {
      name: "edit_file",
      description: "Surgically edit a file. Provide 'oldString' (exact block to replace) and 'newString', OR provide line numbers ('startLine' and 'endLine').",
      schema: z.object({
        filePath: z.string().describe("Path of the file to edit"),
        oldString: z.string().optional().describe("Exact unique snippet to find and replace"),
        newString: z.string().describe("New code to insert"),
        startLine: z.number().optional().describe("Start line number (1-indexed)"),
        endLine: z.number().optional().describe("End line number (1-indexed)"),
      }),
    }
  );

  // 7. FILE REMOVAL
  const delete_file = tool(
    async ({ filePath }) => {
      try {
        const cleanPath = normalizePath(filePath);
        const ytext = ydoc.getText(cleanPath);
        const len = ytext.toString().length;

        if (len === 0 && !Array.from(ydoc.share.keys()).includes(cleanPath)) {
          return `Error: File '${cleanPath}' does not exist.`;
        }

        ytext.delete(0, len);
        return `File '${cleanPath}' successfully removed.`;
      } catch (err) {
        return `Error deleting file: ${err.message}`;
      }
    },
    {
      name: "delete_file",
      description: "Delete a single file from the project workspace.",
      schema: z.object({
        filePath: z.string().describe("Path of the file to delete"),
      }),
    }
  );

  // 8. FILE OR FOLDER RENAME & MOVE
  const move_file = tool(
    async ({ sourcePath, destinationPath }) => {
      try {
        const src = normalizePath(sourcePath);
        const dest = normalizePath(destinationPath);

        const allKeys = Array.from(ydoc.share.keys());
        const isFolder = allKeys.some(k => k.startsWith(`${src}/`));

        if (isFolder) {
          // Recursive directory move
          let movedCount = 0;
          allKeys.filter(k => k.startsWith(`${src}/`)).forEach(oldKey => {
            const suffix = oldKey.slice(src.length);
            const newKey = `${dest}${suffix}`;
            
            const oldText = ydoc.getText(oldKey);
            const content = oldText.toString();
            
            const newText = ydoc.getText(newKey);
            newText.insert(0, content);
            oldText.delete(0, content.length);
            movedCount++;
          });
          return `Successfully moved directory '${src}' to '${dest}' (${movedCount} files updated).`;
        }

        // Single file move
        const srcText = ydoc.getText(src);
        const content = srcText.toString();
        if (!content) return `Error: Source file '${src}' does not exist or is empty.`;

        const destText = ydoc.getText(dest);
        destText.insert(0, content);
        srcText.delete(0, content.length);

        return `Successfully moved '${src}' to '${dest}'.`;
      } catch (err) {
        return `Error moving path: ${err.message}`;
      }
    },
    {
      name: "move_file",
      description: "Rename or move a file or entire directory to a new target path.",
      schema: z.object({
        sourcePath: z.string().describe("Current file or folder path"),
        destinationPath: z.string().describe("New destination file or folder path"),
      }),
    }
  );

  // 9. RECURSIVE DIRECTORY CLEANER
  const delete_directory = tool(
    async ({ directoryPath }) => {
      try {
        const cleanDir = normalizePath(directoryPath);
        if (!cleanDir || cleanDir === "." || cleanDir === "/") {
          return "Safety Error: Refusing to delete the entire project root workspace.";
        }

        const prefix = `${cleanDir}/`;
        const allKeys = Array.from(ydoc.share.keys());
        const filesToDelete = allKeys.filter(k => normalizePath(k).startsWith(prefix));

        if (filesToDelete.length === 0) {
          return `Directory '${cleanDir}' contains no active files or does not exist.`;
        }

        filesToDelete.forEach(k => {
          const ytext = ydoc.getText(k);
          ytext.delete(0, ytext.toString().length);
        });

        return `Deleted directory '${cleanDir}/' and removed ${filesToDelete.length} nested file entries.`;
      } catch (err) {
        return `Error deleting directory: ${err.message}`;
      }
    },
    {
      name: "delete_directory",
      description: "Recursively delete a directory and all nested files inside it. Protected against root directory deletion.",
      schema: z.object({
        directoryPath: z.string().describe("Target folder path to delete (e.g., 'src/legacy')"),
      }),
    }
  );

  // 10. ISOLATED NON-BLOCKING TERMINAL EXECUTION (SOCKET RPC)
  const run_terminal_command = tool(
    async ({ command }) => {
      return new Promise((resolve) => {
        try {
          // Blacklist blocking / interactive commands that cause timeouts
          const blockingPatterns = [/^(npm|yarn|pnpm)\s+(start|run\s+dev|serve)/, /^node\s+(server|app|index)\.js$/, /^nodemon/, /^tail\s+-f/];
          if (blockingPatterns.some(pattern => pattern.test(command.trim()))) {
            return resolve("Execution Error: Persistent background servers (e.g., 'npm start', 'node server.js') are not supported in tools because they never exit. Use syntax checks like 'node -c <file>' or test suites.");
          }

          const targetRoom = userSocketId || projectId;

          // Emit execution RPC to room or socket ID
          io.timeout(12000).to(targetRoom).emit("execute-command", { command }, (err, responses) => {
            if (err) {
              return resolve(`Terminal execution timed out (12s). Verify that the WebContainer shell is booted.`);
            }

            try {
              const res = responses[0];
              const rawOutput = Array.isArray(res) ? (Array.isArray(res[1]) ? res[1][0] : res[1]) : res;
              const output = typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);
              resolve(truncateOutput(`Terminal output:\n${output || "(Command exited with code 0 and no output)"}`, 4000));
            } catch {
              resolve("Command executed successfully, but terminal output parsing encountered an issue.");
            }
          });
        } catch (err) {
          resolve(`Terminal RPC failed: ${err.message}`);
        }
      });
    },
    {
      name: "run_terminal_command",
      description: "Execute non-blocking shell commands (e.g., 'npm test', 'node -c <file>', 'ls') inside the user's WebContainer. Use strictly on-demand.",
      schema: z.object({
        command: z.string().describe("The non-blocking shell command to run"),
      }),
    }
  );

  return [
    search_code,
    list_directory,
    read_file,
    create_directory,
    write_file,
    edit_file,
    delete_file,
    move_file,
    delete_directory,
    run_terminal_command
  ];
};

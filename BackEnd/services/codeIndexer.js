import fs from "fs";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Document } from "@langchain/core/documents";

// Determine the active API key for embeddings
const getEmbeddingKey = () => {
  const keysString = process.env.GEMINI_API_KEYS || process.env.GOOGLE_AI_KEY;
  if (!keysString) throw new Error("Missing GEMINI_API_KEYS or GOOGLE_AI_KEY in .env");
  const keys = keysString.split(",").map(k => k.trim()).filter(Boolean);
  return keys[0];
};

const getEmbeddingsModel = () => {
  const model = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: getEmbeddingKey(),
    taskType: "RETRIEVAL_DOCUMENT",
  });

  // Patch LangChain's broken embedQuery
  model.embedQuery = async (query) => {
    const res = await model.embedDocuments([query]);
    return res[0];
  };

  return model;
};

// In-memory cache for HNSWLib instances per project
const projectStores = {};

// Helper to extract flat list of files from a nested fileTree JSON
const extractFilesFromTree = (fileTree, currentPath = "", files = []) => {
  if (!fileTree) return files;
  
  for (const [key, value] of Object.entries(fileTree)) {
    const newPath = currentPath ? `${currentPath}/${key}` : key;
    if (value.file && value.file.contents) {
      files.push({ filePath: newPath, content: value.file.contents });
    } else if (value.directory) {
      extractFilesFromTree(value.directory, newPath, files);
    }
  }
  return files;
};

// Update or Create Vector Store for a specific project's fileTree
export const updateProjectVectorStore = async (projectId, fileTree) => {
  try {
    console.log(`[RAG] Indexing project ${projectId}...`);
    const storePath = path.join(process.cwd(), `.vector_store_${projectId}`);
    const embeddings = getEmbeddingsModel();
    const documents = [];

    const files = extractFilesFromTree(fileTree);
    
    if (files.length === 0) {
      console.log(`[RAG] No files found to index for project ${projectId}.`);
      return;
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 100,
      separators: ["\nclass ", "\nfunction ", "\nconst ", "\nexport ", "\n\n", "\n", " "],
    });

    for (const file of files) {
      const chunks = await splitter.splitText(file.content);
      chunks.forEach((chunk, index) => {
        documents.push(
          new Document({
            pageContent: chunk,
            metadata: {
              filePath: file.filePath,
              fileName: path.basename(file.filePath),
              chunkIndex: index,
            },
          })
        );
      });
    }

    if (documents.length > 0) {
      const store = await HNSWLib.fromDocuments(documents, embeddings);
      await store.save(storePath);
      projectStores[projectId] = store;
      console.log(`[RAG] Successfully built and saved vector store for ${projectId} (${documents.length} chunks)`);
    }
  } catch (err) {
    console.error(`[RAG] Error updating vector store for ${projectId}:`, err);
  }
};

// Search the codebase for a specific project
export const searchProjectCode = async (projectId, query, k = 4) => {
  try {
    let store = projectStores[projectId];
    const storePath = path.join(process.cwd(), `.vector_store_${projectId}`);
    
    if (!store) {
      if (fs.existsSync(storePath)) {
        store = await HNSWLib.load(storePath, getEmbeddingsModel());
        projectStores[projectId] = store;
      } else {
        return []; // No store exists yet
      }
    }

    const results = await store.similaritySearch(query, k);
    return results;
  } catch (err) {
    console.error(`[RAG] Error searching vector store for ${projectId}:`, err);
    return [];
  }
};

// Clear Vector Store for a project
export const clearProjectVectorStore = async (projectId) => {
  try {
    delete projectStores[projectId];
    const storePath = path.join(process.cwd(), `.vector_store_${projectId}`);
    if (fs.existsSync(storePath)) {
      fs.rmSync(storePath, { recursive: true, force: true });
      console.log(`[RAG] Successfully cleared vector store disk index for project ${projectId}`);
    }
    return true;
  } catch (err) {
    console.error(`[RAG] Error clearing vector store for ${projectId}:`, err);
    return false;
  }
};

import express from 'express';
import { searchProjectCode } from '../services/codeIndexer.js';
import { getGeminiPool } from '../services/geminiPool.js';
import { PromptTemplate } from "@langchain/core/prompts";

const router = express.Router();

router.post('/ask-ai', async (req, res) => {
  try {
    const { question, projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }
    
    // 1. Retrieve the top 4 most relevant code chunks from HNSWLib for this project
    const relevantChunks = await searchProjectCode(projectId, question, 4);
    
    // 2. Format the retrieved codebase context
    const contextStr = relevantChunks.map(chunk => 
      `--- File: ${chunk.metadata.filePath} ---\n${chunk.pageContent}`
    ).join('\n\n');

    // 3. Build a Prompt Template explicitly injecting the codebase context
    const prompt = PromptTemplate.fromTemplate(`
      You are an expert AI pair programmer.
      Use the following retrieved context from the codebase to answer the user's question.
      If the context doesn't contain the answer, rely on your general knowledge but mention you couldn't find it in the provided codebase chunks.

      Codebase Context:
      {context}

      User Question: {question}
      Answer:
    `);

    // 4. Retrieve the Fallback-enabled Gemini Model Pool
    const geminiModel = getGeminiPool();
    
    // 5. Chain the prompt to the model and Invoke
    const chain = prompt.pipe(geminiModel);
    const response = await chain.invoke({
      context: contextStr,
      question: question
    });

    res.json({ 
      answer: response.content, 
      retrievedFiles: [...new Set(relevantChunks.map(c => c.metadata.fileName))] // Unique files
    });

  } catch (error) {
    console.error("RAG Error:", error);
    res.status(500).json({ error: "Failed to process AI request." });
  }
});

router.post('/clear-vector-store', async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }
    const { clearProjectVectorStore } = await import('../services/codeIndexer.js');
    const success = await clearProjectVectorStore(projectId);
    if (success) {
      res.json({ status: "success", message: "Vector DB cleared successfully." });
    } else {
      res.status(500).json({ error: "Failed to clear Vector DB." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

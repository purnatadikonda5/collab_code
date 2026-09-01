import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

const getEmbeddingKey = () => {
  const keysString = process.env.GEMINI_API_KEYS || process.env.GOOGLE_AI_KEY;
  const keys = keysString.split(",").map(k => k.trim()).filter(Boolean);
  return keys[0];
};

async function run() {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: getEmbeddingKey(),
  });
  
  try {
    const res = await embeddings.embedDocuments(["hello world"]);
    console.log("Documents Success! Length:", res.length);
  } catch (e) {
    console.error("Documents Error:", e.message);
  }
}
run();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const getGeminiPool = () => {
  // Try GEMINI_API_KEYS first, fallback to GOOGLE_AI_KEY (what is currently in .env)
  const keysString = process.env.GEMINI_API_KEYS || process.env.GOOGLE_AI_KEY;
  if (!keysString) {
    throw new Error("Missing GEMINI_API_KEYS or GOOGLE_AI_KEY in .env");
  }

  const keys = keysString.split(",").map(key => key.trim()).filter(Boolean);

  if (keys.length === 0) {
    throw new Error("No valid Gemini API keys found.");
  }

  // Instantiate models for each key
  const models = keys.map(
    (key) =>
      new ChatGoogleGenerativeAI({
        model: "models/gemini-3.6-flash",
        apiKey: key,
        temperature: 0.4,
        maxOutputTokens: 8192,
        maxRetries: 3,
      })
  );

  // If there's only one key, return the model directly without fallbacks
  if (models.length === 1) {
    return models[0];
  }

  // Create a fallback chain: models[0] with fallbacks to the rest
  const fallbackModel = models[0].withFallbacks({
    fallbacks: models.slice(1),
  });

  // LangGraph's createReactAgent requires the LLM to have a bindTools method.
  // RunnableWithFallbacks drops this method, so we proxy it to the underlying models.
  fallbackModel.bindTools = (tools, kwargs) => {
    const boundModels = models.map((m) => m.bindTools(tools, kwargs));
    const boundFallback = boundModels[0].withFallbacks({
      fallbacks: boundModels.slice(1),
    });
    // LangGraph's internal `_getModel` also checks `_modelType` on the bound model
    boundFallback._modelType = () => boundModels[0]._modelType();
    return boundFallback;
  };

  // LangGraph also explicitly checks for `_modelType` to verify it's a ChatModel
  fallbackModel._modelType = () => models[0]._modelType();

  return fallbackModel;
};

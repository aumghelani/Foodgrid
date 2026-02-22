import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const port = process.env.PORT || 3001;

if (!process.env.OLLAMA_URL) {
  console.warn("WARN: OLLAMA_URL not set. Defaulting to http://localhost:11434");
}
if (!process.env.OLLAMA_MODEL) {
  console.warn("WARN: OLLAMA_MODEL not set. Defaulting to llama3.1:8b");
}

app.listen(port, () => {
  console.log(`Chatbot API running at http://localhost:${port}`);
});

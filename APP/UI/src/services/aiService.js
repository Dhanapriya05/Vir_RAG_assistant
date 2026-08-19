// Real AI Service connected to the FastAPI RAG Backend

const CANDIDATE_URLS = [
  "/api",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

async function callChatBackend(payload) {
  let lastError = null;

  for (const baseUrl of CANDIDATE_URLS) {
    try {
      const url = `${baseUrl}/chat`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const text = await response.text();
        console.warn(`Attempt on ${url} returned status ${response.status}:`, text);
      }
    } catch (e) {
      lastError = e;
      // try next candidate
    }
  }

  throw lastError || new Error("Failed to connect to backend");
}

export async function askCollegeAI(question, history = [], filename = "") {
  try {
    const data = await callChatBackend({
      question,
      filename: filename || "",
      history: history || [],
    });

    const answer = data.answer || "No response generated.";
    const sources = data.sources || [];
    const firstSource = sources.length > 0 ? sources[0] : null;

    return {
      found: true,
      content: answer,
      source: firstSource,
      sources: sources,
      followups: data.followups || [],
    };
  } catch (err) {
    console.error("Failed to reach FastAPI RAG backend:", err);
    return {
      found: false,
      content: `### Connection to RAG Backend Failed\n\nCould not connect to the Vir RAG Backend.\n\nPlease start the backend server:\n\`\`\`bash\ncd APP\npython run_server.py\n\`\`\`\n\nOnce the backend is running, questions will be answered based on your uploaded Knowledge Base documents.`,
      source: null,
      sources: [],
      followups: ["How do I start the backend server?", "How do I upload knowledge base files?"],
    };
  }
}

export const welcomeMessage = {
  found: true,
  content: `Hello! 👋 I'm your **Vir RAG Assistant**.

I answer questions strictly based on the real files you upload (PDF, Excel, CSV) to the **Knowledge Base** and campus navigation.

👉 **To get started:**
1. Click **Knowledge Base** in the footer to upload your PDF, .xlsx, .xls, or CSV files.
2. Once indexed, ask any questions here and receive accurate, grounded answers with citations!`,
  source: null,
};
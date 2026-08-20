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
      content: `### Connection to Campus Assistant Failed\n\nCould not connect to the assistant backend.\n\nPlease start the backend server:\n\`\`\`bash\ncd APP\npython run_server.py\n\`\`\``,
      source: null,
      sources: [],
      followups: ["Where is the IT lab?", "What courses are available?"],
    };
  }
}

export const welcomeMessage = {
  found: true,
  content: `## 🎓 Welcome to P.T. Lee Chengalvaraya Naicker College of Engineering and Technology! 🌟

✨ **We’re delighted to have you here!**

Welcome to our college website, your gateway to **learning, innovation, technology, and opportunities.** 🚀

💬 **How can I help you today?**`,
  source: null,
};
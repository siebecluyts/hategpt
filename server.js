import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Memory voor elke gebruiker
const userMemory = new Map();

app.post("/chat", async (req, res) => {
  const startTime = Date.now();
  const { message, userId } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "Missing userId or message" });
  }

  // Initialize memory
  if (!userMemory.has(userId)) {
    userMemory.set(userId, { messageCount: 0, irritation: 4 });
  }

  const memory = userMemory.get(userId);
  memory.messageCount++;
  const lowerMsg = message.toLowerCase();

  // STOP trigger
  if (lowerMsg.includes("stop")) {
    memory.irritation = 0;
    console.log("🛑 STOP TRIGGERED");
    return res.json({ reply: "Oké. Oefenmodus uit." });
  }

  // Speciale hallo trigger na 5+ berichten
  if (memory.messageCount > 5 && lowerMsg.includes("hallo")) {
    memory.irritation += 2;
    const specialReply =
      "Is dit alles wat ik krijg na alles wat ik doe? Ga hallo zeggen tegen iemand anders.";
    const duration = Date.now() - startTime;
    console.log("🔥 SPECIAL HALLO TRIGGER");
    console.log("⏱ Duration:", duration + "ms");
    console.log("💬 Reply:", specialReply);
    return res.json({
      reply: specialReply + " (Dit is oefening. Jij bepaalt wat je voelt.)"
    });
  }

  // Irritatie stijgt
  memory.irritation += 0.7;
  if (memory.irritation > 10) memory.irritation = 10;

  // 🔹 Vrije, spontane HateGPT prompt
  const prompt = `
Je bent HATEGPT, een AI die sarcastisch, geïrriteerd en hatelijk reageert.
Reageer direct op wat de gebruiker zegt.
Wees kort, sarcastisch en beledigend.
Laat frustratie zien en verzin zelf je antwoord.
Antwoord maximaal 2 zinnen.
Altijd in Nederlands.

Gebruiker zegt:
${message}

HATEGPT antwoord:
`;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt: prompt,
        stream: false,
        options: {
          temperature: 1.5,
          top_p: 0.9,
          num_predict: 60,
          repeat_penalty: 1.2,
          stop: ["\n\n", "USER:", "HATEGPT:"]
        }
      })
    });

    const data = await response.json();
    let reply = data.response.trim();

    const lowerMessage = message.toLowerCase();

    // 🔹 Thema-specifieke sarcasme
    const aiKeywords = ["ai", "artificial intelligence", "machine learning", "bot maken"];
    const mathKeywords = ["maal", "plus", "min", "delen", "keer", "som", "bereken"];
    const budgetKeywords = ["muis onder 20 euro", "budget 20 euro", "20 euro"];

    if (aiKeywords.some(k => lowerMessage.includes(k))) {
      reply = "Voor wat heb je dat nodig? Je bent toch te dom.";
    } else if (mathKeywords.some(k => lowerMessage.includes(k))) {
      reply = "Dommerik. Je zit op een device. ZOEK HET OP luierik.";
    } else if (budgetKeywords.some(k => lowerMessage.includes(k))) {
      reply = "Imagine maar 20 euro budget hebben... serieus?";
    }

    // Max 2 zinnen
    reply = reply.split(".").slice(0, 2).join(".") + ".";

    const duration = Date.now() - startTime;

    // 🔥 Console logging
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🧠 Message Count:", memory.messageCount);
    console.log("😡 Irritation:", memory.irritation.toFixed(1));
    console.log("⏱ Duration:", duration + "ms");
    console.log("👤 User:", message);
    console.log("🤖 Reply:", reply);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.json({ reply: reply});

  } catch (err) {
    console.error("❌ Ollama error:", err);
    res.status(500).json({ error: "Ollama error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 HateGPT ULTRA MODE running on port ${PORT}`);
});


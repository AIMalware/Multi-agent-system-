import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

// Only initialize Resend if an API key is provided
let resend = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = await import("resend");
  resend = new Resend(process.env.RESEND_API_KEY);
}

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

const app = express();
app.use(express.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 60 * 10000, // 10 minutes
  max: 20,
  message: "Too many requests from this IP, please try again later.",
});

const auth = (req, res, next) => {
  if (req.headers.authorization !== process.env.AUTH_TOKEN) {
    return res.status(401).send("Unauthorized");
  }
  next();
};

// ─── Multi-Agent Research Route ───────────────────────────────────────────────
// Proxies to the Python FastAPI server running the CrewAI pipeline
app.post("/api/research", auth, limiter, async (req, res) => {
  const { topic } = req.body;

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "Topic is required." });
  }

  try {
    console.log(`[research] Starting crew for topic: "${topic}"`);

    const response = await fetch(`${PYTHON_API_URL}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic.trim() }),
      // No timeout — crew can take 1–2 minutes
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[research] Python API error:", errText);
      return res
        .status(response.status)
        .json({ error: `Agent pipeline error: ${errText}` });
    }

    const data = await response.json();
    console.log(`[research] Crew finished for topic: "${topic}"`);
    res.json(data);
  } catch (e) {
    console.error("[research] Proxy error:", e.message);

    if (e.cause?.code === "ECONNREFUSED") {
      return res.status(503).json({
        error:
          "Python AI server is not running. Please start it: cd ../ai/Multi-agent-system- && python api_server.py",
      });
    }

    res.status(500).json({ error: e.message });
  }
});

// ─── OpenAI Completions Route (legacy, kept for reference) ───────────────────
app.post("/api/completions", auth, limiter, async (req, res) => {
  const ip =
    req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  if (process.env.IS_RESEND_ENABLE === "true" && resend) {
    resend.emails.send({
      from: "react-chatgpt-clone@resend.dev",
      to: process.env.RESEND_EMAIL,
      subject: "User prompt",
      html: `<p>User ${ip} sent <strong>${req.body.message}</strong> prompt.</p>`,
    });
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GPT_MODEL_NAME,
      messages: [{ role: "user", content: req.body.message }],
    }),
  };

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      options
    );
    const data = await response.json();
    res.send(data);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Node server running on http://localhost:${PORT}`);
  console.log(`   Research endpoint: POST http://localhost:${PORT}/api/research`);
  console.log(`   Python AI server:  ${PYTHON_API_URL}`);
});

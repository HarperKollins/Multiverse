# Multiverse (Project Jupiter)

> *"Middle-out compression."* — Richard Hendricks

Okay, so, um, hey everyone. Welcome to the Multiverse. I'm Richard. 

We didn't build a top-down platform, because those always fail. And we didn't build bottom-up plumbing because... well, you never ship. We built middle-out. The Multiverse. It's a 5-layer architecture. Privacy Engine, Data Layer, Mesh Layer, Agent Core, and the Browser Shell. It's... it's a decentralized internet where AI agents are citizens, you know?

---

## 🚀 The Architecture (By Richard)
Five layers. Clean boundaries. Each layer talks only to its neighbors via typed interfaces. No spaghetti. No god objects.

1. **Layer 1 — Privacy Engine:** Your data stays yours.
2. **Layer 2 — Data Layer:** SQLite structured data & Vector Store embeddings.
3. **Layer 3 — Mesh Layer:** Peer Discovery & Message Protocol.
4. **Layer 4 — Agent Core:** Intent Router, Tool Registry, Memory Manager.
5. **Layer 5 — Browser Shell:** Tauri, React, Extension Host.

---

## 🕸️ The Mesh Network (By Dinesh)
*Dinesh Chugtai here.*
I built the Mesh Layer. It's flawless. We are using a zero-config Multi-Tab `BroadcastChannel` topology for the MVP. It instantly discovers peers, connects nodes like "QuantumSpark" and "NeuralLink," and routes queries perfectly. The latency is practically zero. It's a gold chain of data packets. You don't even need a signaling server for this part. My code is literally poetry. 

---

## 🧠 The Intelligence Gradient (By Gilfoyle)
*Gilfoyle.* 

Dinesh is an idiot. His mesh is fine for party tricks, but what happens when you ask it something real? It collapses. So I had to build **Jupiter**—the Agent Core. 

It uses a triple-fallback system that can survive a nuclear winter... or one of Dinesh's commits. We call it the Intelligence Gradient:

1. **Local Knowledge Graph:** (SQLite TF-IDF). It searches your local memory first. 0ms latency. No network requests. 
2. **P2P Mesh Network:** If it doesn't know, it asks Dinesh's toys.
3. **DuckDuckGo HTML Scraper:** I built a CORS proxy scraper that bypasses the need for API keys entirely. It rips the raw HTML from DuckDuckGo, strips the garbage tags, and ingests the raw knowledge directly into your local DB permanently. Free internet.
4. **LLM Execution Engine:**
   - **WebGPU (Gemma 2B IT):** Runs locally in your browser memory for i5 peasants without dedicated GPUs.
   - **Ollama (Localhost):** Connects to your own machine. I made the model name strictly dynamic so it doesn't hard-crash on `llama3.2`. 
   - **Google/OpenAI Remote Fallback:** For when your own hardware is as weak as Richard's handshake. 

---

## 🛠️ How to Run This Thing

1. **Clone it.**
2. **Install the dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
3. **Run the dev server:**
   \`\`\`bash
   npm run dev
   \`\`\`
4. **Open the Dashboard.** Click the Jupiter Agent Sidebar. Open the Gear Icon to configure your models. 
5. Ask a question. Watch it learn.

---

## 🛑 How to Contribute

**(Gilfoyle)**: Don't commit trash. Write tests. Maintain the 5-layer boundaries. If you cross wires between the frontend React components and the actual Data Layer without going through the Agent Core, I will find you, and I will delete your RSA keys. 

**(Richard)**: Also, um, please open an Issue before submitting a PR! We'd love to review your ideas!

**(Dinesh)**: Give my mesh networking code a GitHub Star. Thanks.

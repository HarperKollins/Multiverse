# Multiverse (Project Jupiter)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-v19-61dafb.svg)](https://react.dev/)

Multiverse is a decentralized, agent-first browser and knowledge engine workspace. Codenamed **Project Jupiter**, it is built on the philosophy of "middle-out compression" — building outward from the agent layer to both the browser UI and the decentralized mesh network simultaneously. 

The core vision of Multiverse is to create a local-first web environment where AI agents are first-class citizens, participating in a peer-to-peer (P2P) internet to share knowledge, distribute compute, and guarantee absolute user privacy.

---

## 🏗️ Architectural Blueprint

The system is rigorously structured into five well-defined layers with clean boundaries. Each layer communicates exclusively with its immediate neighbors via typed interfaces, preventing architectural decay and ensuring horizontal scalability.

### 1. Privacy Engine (Layer 1)
The foundational layer guaranteeing data sovereignty. All persistent memory and vector embeddings reside strictly on the user's local disk. No telemetry, no forced cloud synchronization. 

### 2. Data Layer (Layer 2)
The structured memory engine powering the agents. 
* **SQLite (FTS5):** Provides instant, full-text search capabilities over the user's ingested knowledge base via TF-IDF (Term Frequency-Inverse Document Frequency) scoring algorithms.
* **Vector Store:** Planned implementation for semantic similarity search enabling deep context retrieval.

### 3. Mesh Layer (Layer 3)
A resilient, decentralized communication protocol.
* **Zero-Config Topology:** The MVP utilizes the `BroadcastChannel` API for instantaneous, zero-configuration P2P peer discovery and query routing across the local environment.
* **Agent Gossip Protocol:** Allows isolated instances to broadcast queries to the mesh and asynchronously render remote cognitive responses inline.

### 4. Agent Core: "Jupiter" (Layer 4)
The cognitive engine of the platform. Jupiter acts as an Intent Router, Tool Registry, and Memory Manager. It operates on a sophisticated **Intelligence Gradient** to resolve user queries with maximal efficiency and minimal latency:
1. **Local Knowledge Retrieval (Tier 1):** Scans the local SQLite TF-IDF database for an immediate, 0ms latency match.
2. **Mesh Network Query (Tier 2):** Broadcasts unresolved intents to connected peer nodes in the topology.
3. **Web Search Fallback (Tier 3):** Dynamically falls back to web crawling. Features a bespoke DuckDuckGo proxy-scraper that extracts raw HTML, sanitizes it of DOM bloat, and permanently ingests the structured text into local memory.
4. **Execution Engine (Tier 4):** Synthesizes the retrieved context relying on a dynamic, triple-fallback LLM provider system:
   * **WebGPU (Local In-Browser):** Leverages WebLLM to run high-performance models (like *Gemma 2B IT*) natively in the browser via WebGPU, bypassing server costs and preserving privacy.
   * **Ollama (Localhost):** Connects to discrete desktop daemon processes for configurable, heavyweight inference (e.g., *Llama 3*, *Mistral*).
   * **Remote API (Cloud):** A traditional robust fallback connecting to OpenAI or Google structured endpoints.

### 5. Browser Shell (Layer 5)
The presentation layer built on advanced desktop tech.
* **Tauri (v2) & React (v19):** A highly performant, memory-safe Rust backend coupled with a reactive TypeScript frontend.
* Features a dark, terminal-aesthetic UI, dynamic topology visualizers, and an integrated Agent Sidebar for real-time interaction and status monitoring.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (for Tauri builds)
- A browser supporting **WebGPU** (Chrome 113+, Edge 113+). 

### Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/HarperKollins/Multiverse.git
   cd Multiverse/multiverse
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`
   *(Note: The vite config initializes with strict Cross-Origin Isolation headers required for WebGPU `SharedArrayBuffer` memory allocation.)*

---

## ⚙️ Configuration

Multiverse is highly configurable via the **Jupiter Brain Settings** modal in the UI:
1. Open the Agent Sidebar (Jupiter icon).
2. Click the configuration gear.
3. **Select Execution Engine:** Toggle smoothly between WebGPU, Ollama, and Remote APIs.
4. **Configure Search:** Enter Google Custom Search API credentials or utilize the free DuckDuckGo HTML scraper.

---

## 🤝 Contributing

We welcome contributions from researchers, engineers, and standard-bearers of the decentralized web. 

### Guidelines:
1. **Maintain Layer Boundaries:** Ensure that frontend React components do not directly mutate Layer 2 (Data) state without interacting via the Layer 4 (Agent Core) typed interfaces.
2. **Testing:** New providers or tools added to the Agent Core must include comprehensive edge-case testing, particularly network instability fallbacks.
3. **Process:** Please open an Issue outlining the architectural intent before submitting a Pull Request.

---

*Invert the architecture. Decentralize the intelligence. Build the Multiverse.*

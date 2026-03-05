# Multiverse (Project Jupiter)

> 🚧 **EARLY DEVELOPMENT — ACTIVE BUILD PHASE**
>
> ✅ Working: Jupiter agent sidebar • TF-IDF knowledge search • 3× LLM providers (WebGPU/Ollama/API) • Mesh gossip protocol • WebRTC cross-location P2P • Network topology visualizer • SearXNG/Brave/DDG cascading search
>
> 🔨 In Progress: Real-time dashboard metrics • Plugin ecosystem • CRDT knowledge sync

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-v19-61dafb.svg)](https://react.dev/)

Multiverse is a decentralized, agent-first browser and knowledge engine. Codenamed **Project Jupiter**, every instance is both a client and a server — there is no central authority. AI agents are first-class citizens, participating in a P2P mesh to share knowledge, distribute query resolution, and guarantee absolute user privacy.

---

## 🏗️ Architecture

```
┌─────────────── Browser Shell (React/Tauri) ───────────────┐
│  AgentSidebar • Dashboard • Topology • Settings • Plugins │
├───────────────── Agent Core ("Jupiter") ──────────────────┤
│  Intelligence Gradient • Tool Registry • LLM Providers    │
├──────────────── Mesh Network (P2P) ───────────────────────┤
│  BroadcastChannel (local) + WebRTC (cross-location)       │
│  Signaling Server • STUN NAT traversal • Agent Protocol   │
├───────────────── Data Layer ──────────────────────────────┤
│  IndexedDB • TF-IDF Search • Anti-poisoning (trust/conf)  │
├───────────────── Tauri Rust Backend ──────────────────────┤
│  Ollama Proxy (CORS-free) • Ed25519 Identity • Crypto     │
└───────────────────────────────────────────────────────────┘
```

> See [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) for detailed data flows and design rationale.

---

## 🧠 Intelligence Gradient

Jupiter resolves queries through a 4-tier fallback chain:

| Tier | Source | Latency | Privacy |
|------|--------|---------|---------|
| 1 | Local Knowledge (TF-IDF on IndexedDB) | ~1ms | 🟢 100% local |
| 2 | Mesh Peers (BroadcastChannel + WebRTC) | ~50ms | 🟡 Peer sees query |
| 3 | Web Search (SearXNG → Brave → DDG cascade) | ~500ms | 🟡 Search engine sees query |
| 4 | LLM Generation (WebGPU / Ollama / API) | ~2-5s | 🟢 Local or 🔴 Cloud |

---

## 🌐 Cross-Location P2P

**Two machines anywhere in the world can connect directly.** No central server relays data.

- **Same WiFi:** Automatic via BroadcastChannel (tab-to-tab) 
- **Different WiFi / Different Countries:** WebRTC via signaling server + STUN NAT traversal
- **STUN servers used:** Google (`stun.l.google.com:19302`), Cloudflare (`stun.cloudflare.com:3478`) — free, no account

```
Node A (Lagos) ──WebSocket──→ Signaling Server ←──WebSocket── Node B (NYC)
                           (handshake only, then:)
Node A ────────────── WebRTC DataChannel (encrypted) ────────── Node B
```

To run the signaling server:
```bash
cd signaling-server && npm install && npm start
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/) (for Tauri builds)
- [Ollama](https://ollama.com/) (optional, for local LLM)
- Browser with **WebGPU** support (Chrome 113+, Edge 113+)

### Installation

```bash
git clone https://github.com/HarperKollins/Multiverse.git
cd Multiverse/multiverse
npm install
```

### Run (Web Dev Mode)
```bash
npm run dev
```

### Run (Tauri Desktop App)
```bash
npm run tauri dev
```

### Connect Ollama
If using Ollama for local LLM, set the CORS environment variable:

**Windows (PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")
# Restart Ollama after setting
```

**macOS/Linux:**
```bash
export OLLAMA_ORIGINS="*"
ollama serve
```

---

## ⚙️ Configuration

Open the Agent Sidebar → click ⚙️ Settings:

| Setting | Options |
|---------|---------|
| LLM Provider | WebGPU (in-browser) · Ollama (local) · OpenAI API |
| Search | SearXNG (self-hosted) · Brave (2000 free/mo) · DuckDuckGo · Google CSE |
| Signaling Server | Default: `ws://localhost:9090` |

---

## 📂 Project Structure

```
multiverse/
├── src/
│   ├── components/        # React UI components
│   ├── lib/
│   │   ├── agent-core/    # LLM providers, search, runtime, tool registry
│   │   ├── plugins/       # Plugin loader and API
│   │   ├── database.ts    # IndexedDB persistent storage
│   │   ├── knowledge.ts   # TF-IDF search engine
│   │   ├── peer-manager.ts # BroadcastChannel mesh
│   │   ├── webrtc-transport.ts # WebRTC cross-location P2P
│   │   ├── mesh-types.ts  # Protocol type definitions
│   │   └── logger.ts      # Structured logging & metrics
│   └── App.tsx
├── src-tauri/
│   └── src/
│       ├── lib.rs         # Ollama proxy + identity commands
│       └── identity.rs    # Ed25519 node identity
├── signaling-server/      # WebSocket peer discovery server
├── docs/
│   └── agent-protocol.md  # Agent communication protocol spec
├── TECHNICAL_ARCHITECTURE.md
├── VISION.md
└── LICENSE                # MIT
```

---

## 🤝 Contributing

1. **Maintain Layer Boundaries:** Frontend components should not directly access IndexedDB — go through the Agent Core.
2. **Agent Protocol:** All mesh messages must follow the [Agent Protocol spec](./docs/agent-protocol.md).
3. **Open an Issue first** before submitting a Pull Request.

---

*Invert the architecture. Decentralize the intelligence. Build the Multiverse.*

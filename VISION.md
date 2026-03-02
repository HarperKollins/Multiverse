## Multiverse (Project Jupiter): The Vision

Multiverse is not merely a web browser, nor is it just another wrapper around an LLM. It is a fundamental rethinking of how intelligence, user data, and the internet intersect. 

This document outlines the philosophical intent and immediate technical roadmap for Project Jupiter. Product development is iterative, but our architectural design principles are absolute.

For developer instructions and technical architecture, see [`README.md`](README.md).

### The Core Problem

The modern web is highly centralized, fundamentally un-private, and operationally passive. Users do not truly own their data—they rent access to it through third-party SaaS platforms. Furthermore, web browsers act as passive document viewers rather than active, intelligent workspaces.

### The Objective

To build a **decentralized, agent-first workspace** where users command supreme sovereignty over their data, their cognitive resources, and their connectivity. 

We seek to seamlessly merge:
1. **Local-First Capabilities:** Data never leaves the machine unless explicitly told to.
2. **Ambient Intelligence:** AI agents are seamlessly integrated into the user interface, reading what the user reads, and learning passively.
3. **Decentralized Distribution:** Shifting from server-client hierarchies to peer-to-peer (P2P) mesh networking where agents gossip to resolve queries autonomously.

### The Intelligence Gradient

To achieve reliable agentic intelligence without forcing the user to pay recurring API fees or rely on external clouds, Project Jupiter employs the "Intelligence Gradient"—a tiered resolution system:

1. **Local Memory Engine:** Using highly optimized SQLite Full-Text Search (FTS5), Jupiter attempts to answer queries using the user's previously ingested local knowledge graph instantly.
2. **Mesh Discovery:** If local memory is insufficient, the query is broadcast across the P2P mesh network (`BroadcastChannel` MVP) to ask connected trusted peers (other agent instances).
3. **Free Web Crawling:** If peers do not know the answer, Jupiter bypasses conventional search APIs. It utilizes a custom DuckDuckGo HTML scraper deployed through public CORS proxies to pull raw web data, parse it locally, and answer the query—ingesting the result for future local memory hits.
4. **Execution Agility:** The underlying logical inference runs dynamically depending on the user's hardware. It scales down to WebGPU (`Gemma 2B`) for standard browser environments, up to discrete daemon endpoints (`Ollama`), and falls back to remote endpoints (`OpenAI`) only when explicitly configured.

### Focus & Immediate Priorities

Our current technical focus is stability, performance, and scaling the decentralized capabilities:

**Priority 1: Core System Hardening**
- Stabilize the multi-provider LLM runtime.
- Bulletproof the Vector Store implementation for dense semantic retrieval alongside FTS5.
- Optimize React/Tauri rendering for large local knowledge graphs.

**Priority 2: The Outer Mesh**
- Evolve the Layer 3 Mesh topology from local `BroadcastChannel` to true wide-area network P2P (e.g., Libp2p or WebRTC over signaling channels).
- Implement robust cryptographic "Trust Scores" for peers gossiping over the network to prevent malicious data injection.

**Priority 3: Active Agency**
- Transition Jupiter from a reactive respondent to a proactive worker (e.g., autonomous background scraping based on inferred user intent).

### Engineering Principles

- **Zero Telemetry.** We do not track you. The product operates fully offline out-of-the-box.
- **Strict Boundary Enforcement.** The 5-Layer architecture (Privacy -> Data -> Mesh -> Agent -> Shell) is religious law. Skipping layers creates unmaintainable monolithic technical debt.
- **Aggressive Modularity.** Every component (e.g., the `ISearchProvider`, the `ILLMProvider`) must strictly adhere to its interface contract to ensure future components can be dynamically swapped as AI moves at light-speed.

We are building the intelligent, sovereign web.

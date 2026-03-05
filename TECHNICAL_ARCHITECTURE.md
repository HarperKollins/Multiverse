# Multiverse Technical Architecture

## System Overview

Multiverse is a decentralized, agent-first workspace built with Tauri v2 + React + Rust. Every instance is both a client and a server — there is no central authority.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser Shell (React + TypeScript)                             │
│  ├── AgentSidebar — Jupiter AI interface                        │
│  ├── Dashboard — real-time metrics and topology                 │
│  ├── Settings — provider configuration                          │
│  └── Plugin UI panels                                           │
├─────────────────────────────────────────────────────────────────┤
│  Agent Core                                                     │
│  ├── Intelligence Gradient — Local → Web → LLM fallback chain   │
│  ├── Tool Registry — built-in + plugin tools                    │
│  ├── Search Providers — SearXNG, Brave, DDG, Google             │
│  └── LLM Providers — WebGPU (local), Ollama, OpenAI API        │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                     │
│  ├── IndexedDB — persistent knowledge storage                   │
│  ├── TF-IDF Search — local keyword matching                     │
│  └── Anti-poisoning — trust scores, confirmations, source track │
├─────────────────────────────────────────────────────────────────┤
│  Mesh Network                                                   │
│  ├── BroadcastChannel — local tab-to-tab sync                   │
│  ├── WebRTC Transport — cross-location P2P (via STUN/TURN)      │
│  ├── Signaling Server — WebSocket peer discovery                 │
│  └── Agent Protocol — QUERY, ANSWER, SHARE, TRUST_VOTE          │
├─────────────────────────────────────────────────────────────────┤
│  Tauri Rust Backend                                             │
│  ├── Ollama Proxy — CORS-free LLM access                        │
│  ├── Ed25519 Identity — persistent node keypair                  │
│  └── System Services — filesystem, crypto, networking            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: "User Asks Jupiter a Question"

1. User types question in `AgentSidebar`
2. `runtime.ask()` enters the Intelligence Gradient:
   - **Tier 1:** TF-IDF search of local knowledge (IndexedDB) — ~1ms
   - **Tier 2:** Broadcast question to mesh peers (BroadcastChannel + WebRTC) — ~50ms
   - **Tier 3:** Cascading web search (SearXNG → Brave → DDG) — ~500ms
   - **Tier 4:** LLM generation with accumulated context — ~2-5s
3. Response streams back to UI via `onUpdate` callback
4. Peer answers (from mesh) appear as separate messages
5. Scraped web content auto-ingested into knowledge base

## Cross-Location P2P Flow

```
Node A (New York)                    Node B (Lagos)
    │                                    │
    ├──WebSocket──→ Signaling Server ←──WebSocket──┤
    │            (peer discovery only)              │
    │                                               │
    ├──────── WebRTC Data Channel (encrypted) ──────┤
    │         (via Google/CF STUN servers)           │
    │         NAT traversal: automatic               │
    │                                               │
    └── Direct P2P: QUERY, ANSWER, SHARE, TRUST ───┘
```

STUN servers used (free, no account):
- `stun.l.google.com:19302`
- `stun.cloudflare.com:3478`

## Why These Technology Choices?

| Choice | Why Not Alternative |
|---|---|
| **Tauri** over Electron | 10x smaller binary, Rust backend, native webview |
| **IndexedDB** over SQLite-in-browser | Works everywhere, no WASM overhead, IndexedDB has no size limits |
| **Ed25519** over RSA | 32-byte keys, faster signing, Ed25519 is the P2P standard |
| **WebRTC** over WebSocket relay | True P2P — no server sees your data after handshake |
| **TF-IDF** over embeddings | CPU-friendly, no model download, works offline instantly |
| **SearXNG** over direct scraping | 243 engines, JSON API, no fragile HTML parsing |
| **BroadcastChannel** for local | Zero setup for tab sync, keep it alongside WebRTC for network |

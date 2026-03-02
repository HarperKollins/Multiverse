// ── Multiverse Local Database ──
// Uses localStorage for persistence (no external deps needed)

import type { KnowledgeEntry, HistoryEntry } from './types';

const STORAGE_KEYS = {
    knowledge: 'mv_knowledge',
    history: 'mv_history',
    bookmarks: 'mv_bookmarks',
} as const;

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadCollection<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveCollection<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// ── Knowledge CRUD ──

export function getAllKnowledge(): KnowledgeEntry[] {
    return loadCollection<KnowledgeEntry>(STORAGE_KEYS.knowledge);
}

export function getKnowledgeCount(): number {
    return getAllKnowledge().length;
}

export function addKnowledge(
    entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessedAt'>
): KnowledgeEntry {
    const entries = getAllKnowledge();
    const now = Date.now();
    const newEntry: KnowledgeEntry = {
        ...entry,
        id: generateId(),
        createdAt: now,
        accessedAt: now,
    };
    entries.unshift(newEntry);
    saveCollection(STORAGE_KEYS.knowledge, entries);
    return newEntry;
}

export function updateKnowledgeAccess(id: string): void {
    const entries = getAllKnowledge();
    const entry = entries.find((e) => e.id === id);
    if (entry) {
        entry.accessedAt = Date.now();
        saveCollection(STORAGE_KEYS.knowledge, entries);
    }
}

export function deleteKnowledge(id: string): void {
    const entries = getAllKnowledge().filter((e) => e.id !== id);
    saveCollection(STORAGE_KEYS.knowledge, entries);
}

// ── History CRUD ──

export function getHistory(): HistoryEntry[] {
    return loadCollection<HistoryEntry>(STORAGE_KEYS.history);
}

export function addHistory(url: string, title: string): HistoryEntry {
    const entries = getHistory();
    const newEntry: HistoryEntry = {
        id: generateId(),
        url,
        title,
        visitedAt: Date.now(),
    };
    entries.unshift(newEntry);
    // Keep last 1000 entries
    if (entries.length > 1000) entries.length = 1000;
    saveCollection(STORAGE_KEYS.history, entries);
    return newEntry;
}

// ── Seed sample knowledge ──

export function seedSampleKnowledge(): void {
    if (getKnowledgeCount() > 0) return;

    const samples: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessedAt'>[] = [
        {
            title: 'P2P Network Protocols',
            content: 'Peer-to-peer networks use protocols like BitTorrent, IPFS, and libp2p for decentralized communication. libp2p is modular and supports multiple transports including TCP, WebSocket, and WebRTC. Kademlia DHT is commonly used for peer discovery across wide-area networks.',
            sourceUrl: 'https://docs.libp2p.io',
            sourceType: 'page',
            tags: ['p2p', 'networking', 'libp2p', 'protocols', 'decentralized'],
            trustScore: 0.95,
        },
        {
            title: 'Tauri v2 Architecture',
            content: 'Tauri v2 is a framework for building desktop apps with web frontend and Rust backend. It uses system webviews instead of bundling Chromium, resulting in much smaller binaries. Tauri v2 introduces a new plugin system, mobile support, and improved IPC between frontend and backend.',
            sourceUrl: 'https://tauri.app/v2',
            sourceType: 'page',
            tags: ['tauri', 'desktop', 'rust', 'webview', 'framework'],
            trustScore: 1.0,
        },
        {
            title: 'CRDT Merge Strategies',
            content: 'Conflict-free Replicated Data Types (CRDTs) enable distributed systems to merge state without coordination. Common types include G-Counters (grow-only), LWW-Registers (last-write-wins), OR-Sets (observed-remove sets), and Merkle-CRDTs for versioned trees. CRDTs are used in collaborative editors, distributed databases, and P2P knowledge sharing.',
            sourceUrl: 'https://crdt.tech',
            sourceType: 'page',
            tags: ['crdt', 'distributed', 'merge', 'sync', 'p2p'],
            trustScore: 0.9,
        },
        {
            title: 'Vector Embeddings for Search',
            content: 'Vector embeddings represent text as high-dimensional vectors enabling semantic similarity search. Models like sentence-transformers produce 384-768 dimensional vectors. sqlite-vss and FAISS enable fast approximate nearest neighbor search. For CPU-only environments, quantized models and TF-IDF can provide lightweight alternatives.',
            sourceUrl: 'https://www.sbert.net',
            sourceType: 'search',
            tags: ['embeddings', 'vectors', 'search', 'ai', 'nlp'],
            trustScore: 0.85,
        },
        {
            title: 'WebSocket Gateway Design',
            content: 'WebSocket gateways manage persistent connections between clients and servers. Key patterns include heartbeat/ping-pong for connection health, message framing with JSON or protobuf, session state management, presence tracking, and reconnection strategies with exponential backoff. OpenClaw uses a WS gateway for agent control plane communication.',
            sourceUrl: 'https://github.com/openclaw',
            sourceType: 'page',
            tags: ['websocket', 'gateway', 'realtime', 'networking', 'agents'],
            trustScore: 0.92,
        },
        {
            title: 'Privacy-First Browsing',
            content: 'Privacy-focused browsers block trackers, ads, and fingerprinting scripts. EasyList and EasyPrivacy are filter lists used by ad blockers. Techniques include DNS-level blocking, request interception, cookie isolation, and canvas fingerprint randomization. Brave Browser pioneered the privacy-first approach with built-in shields.',
            sourceUrl: 'https://brave.com/privacy-features',
            sourceType: 'page',
            tags: ['privacy', 'browser', 'tracking', 'adblock', 'security'],
            trustScore: 0.88,
        },
    ];

    for (const sample of samples) {
        addKnowledge(sample);
    }
}

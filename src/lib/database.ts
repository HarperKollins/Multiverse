// ── Multiverse Local Database ──
// Uses IndexedDB for persistent storage (survives browser restarts, no size limits)
// Falls back to localStorage if IndexedDB unavailable

import type { KnowledgeEntry, HistoryEntry } from './types';

const DB_NAME = 'multiverse_db';
const DB_VERSION = 2;
const STORES = {
    knowledge: 'knowledge',
    history: 'history',
} as const;

// ── IndexedDB Setup ──

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORES.knowledge)) {
                const knowledgeStore = db.createObjectStore(STORES.knowledge, { keyPath: 'id' });
                knowledgeStore.createIndex('sourceType', 'sourceType', { unique: false });
                knowledgeStore.createIndex('trustScore', 'trustScore', { unique: false });
                knowledgeStore.createIndex('createdAt', 'createdAt', { unique: false });
                knowledgeStore.createIndex('sourcePeerId', 'sourcePeerId', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.history)) {
                const historyStore = db.createObjectStore(STORES.history, { keyPath: 'id' });
                historyStore.createIndex('visitedAt', 'visitedAt', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = (event.target as IDBOpenDBRequest).result;
            resolve(dbInstance);
        };

        request.onerror = () => {
            console.warn('[DB] IndexedDB failed, falling back to localStorage');
            reject(request.error);
        };
    });
}

// ── Generic IndexedDB Helpers ──

async function getAll<T>(storeName: string): Promise<T[]> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch {
        // Fallback to localStorage
        try {
            const raw = localStorage.getItem(`mv_${storeName}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }
}

async function put<T>(storeName: string, item: T): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.put(item);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // Fallback: save entire collection to localStorage
        const all = await getAll<T>(storeName);
        localStorage.setItem(`mv_${storeName}`, JSON.stringify(all));
    }
}

async function remove(storeName: string, id: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // noop for localStorage fallback
    }
}

// ── ID Generation ──

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Knowledge CRUD (async) ──

export async function getAllKnowledgeAsync(): Promise<KnowledgeEntry[]> {
    return getAll<KnowledgeEntry>(STORES.knowledge);
}

// Synchronous version for backward compatibility (reads from cache)
let _knowledgeCache: KnowledgeEntry[] = [];
let _cacheInitialized = false;

async function refreshCache(): Promise<void> {
    _knowledgeCache = await getAllKnowledgeAsync();
    _cacheInitialized = true;
}

// Initialize cache on load
refreshCache().catch(() => { });

export function getAllKnowledge(): KnowledgeEntry[] {
    if (!_cacheInitialized) {
        // First-time fallback: try localStorage
        try {
            const raw = localStorage.getItem('mv_knowledge');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }
    return _knowledgeCache;
}

export function getKnowledgeCount(): number {
    return getAllKnowledge().length;
}

export async function addKnowledge(
    entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'accessedAt'> & {
        confirmationCount?: number;
        confidence?: number;
        peerId?: string;
    }
): Promise<KnowledgeEntry> {
    const now = Date.now();
    const newEntry: KnowledgeEntry = {
        ...entry,
        id: generateId(),
        createdAt: now,
        accessedAt: now,
        confirmationCount: entry.confirmationCount ?? 1,
        confidence: entry.confidence ?? entry.trustScore,
    };

    await put(STORES.knowledge, newEntry);
    _knowledgeCache.unshift(newEntry);

    // Also keep localStorage in sync for backward compat
    localStorage.setItem('mv_knowledge', JSON.stringify(_knowledgeCache));

    return newEntry;
}

export async function updateKnowledgeAccess(id: string): Promise<void> {
    const entry = _knowledgeCache.find((e) => e.id === id);
    if (entry) {
        entry.accessedAt = Date.now();
        await put(STORES.knowledge, entry);
    }
}

export async function deleteKnowledge(id: string): Promise<void> {
    _knowledgeCache = _knowledgeCache.filter((e) => e.id !== id);
    await remove(STORES.knowledge, id);
    localStorage.setItem('mv_knowledge', JSON.stringify(_knowledgeCache));
}

// ── History CRUD ──

export async function getHistory(): Promise<HistoryEntry[]> {
    return getAll<HistoryEntry>(STORES.history);
}

export async function addHistory(url: string, title: string): Promise<HistoryEntry> {
    const newEntry: HistoryEntry = {
        id: generateId(),
        url,
        title,
        visitedAt: Date.now(),
    };
    await put(STORES.history, newEntry);
    return newEntry;
}

// ── Seed sample knowledge ──

export async function seedSampleKnowledge(): Promise<void> {
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
            title: 'WebRTC for Decentralized Communication',
            content: 'WebRTC enables peer-to-peer communication directly between browsers without a central server. It handles NAT traversal using STUN servers (free, lightweight) and TURN servers (relay fallback for restrictive networks). Combined with libp2p Circuit Relay V2, WebRTC enables cross-location P2P connections even across different WiFi networks and locations worldwide.',
            sourceUrl: 'https://webrtc.org',
            sourceType: 'page',
            tags: ['webrtc', 'p2p', 'networking', 'decentralized', 'nat-traversal'],
            trustScore: 0.92,
        },
        {
            title: 'MCP Model Context Protocol',
            content: 'The Model Context Protocol (MCP) is an open standard by Anthropic for AI tool integration. Adopted by OpenAI, Google DeepMind, and Anthropic in 2025-2026. It defines Tools (executable functions), Resources (data sources), and Prompts (workflows). Uses JSON-RPC 2.0 over Streamable HTTP. The Sampling feature enables bidirectional communication — servers can request LLM completions.',
            sourceUrl: 'https://modelcontextprotocol.io',
            sourceType: 'page',
            tags: ['mcp', 'ai', 'protocol', 'tools', 'integration'],
            trustScore: 0.98,
        },
    ];

    for (const sample of samples) {
        await addKnowledge(sample);
    }
}

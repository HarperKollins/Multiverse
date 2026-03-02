// ── Multiverse Peer Manager ──
// Uses BroadcastChannel for same-machine discovery (multi-tab)
// Future: WebSocket/libp2p for cross-machine P2P

import type { PeerInfo, MeshMessage, MeshEvent, MeshState } from './mesh-types';
import { getKnowledgeCount } from './database';

type MeshListener = (state: MeshState) => void;

const CHANNEL_NAME = 'multiverse-mesh';
const HEARTBEAT_INTERVAL = 5000;
const PEER_TIMEOUT = 15000;

function generatePeerId(): string {
    return `0x${Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;
}

function generatePeerName(): string {
    const adjectives = ['Swift', 'Silent', 'Bright', 'Deep', 'Cosmic', 'Quantum', 'Neural', 'Shadow'];
    const nouns = ['Node', 'Jupiter', 'Core', 'Spark', 'Wave', 'Pulse', 'Link', 'Vertex'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}`;
}

class PeerManager {
    private channel: BroadcastChannel | null = null;
    private localPeerId: string;
    private localPeerName: string;
    private peers: Map<string, PeerInfo> = new Map();
    private events: MeshEvent[] = [];
    private answers: import('./mesh-types').MeshAnswer[] = [];
    private listeners: Set<MeshListener> = new Set();
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;
    private isOnline = false;

    constructor() {
        this.localPeerId = generatePeerId();
        this.localPeerName = generatePeerName();
    }

    /** Start mesh networking */
    start(): void {
        if (this.isOnline) return;

        try {
            this.channel = new BroadcastChannel(CHANNEL_NAME);
            this.channel.onmessage = (e: MessageEvent) => this.handleMessage(e.data);
            this.isOnline = true;

            // Announce presence
            this.broadcast({
                type: 'ANNOUNCE',
                payload: {
                    type: 'ANNOUNCE',
                    capabilities: ['search', 'knowledge', 'index'],
                    knowledgeCount: getKnowledgeCount(),
                },
            });

            // Start heartbeat
            this.heartbeatTimer = setInterval(() => {
                this.broadcast({
                    type: 'PING',
                    payload: { type: 'PING' },
                });
            }, HEARTBEAT_INTERVAL);

            // Cleanup stale peers
            this.cleanupTimer = setInterval(() => {
                this.cleanupStalePeers();
            }, HEARTBEAT_INTERVAL * 2);

            this.addEvent('peer_joined', this.localPeerId, this.localPeerName, 'Local node came online');
            this.notifyListeners();
        } catch (err) {
            console.warn('[Mesh] BroadcastChannel not available:', err);
        }
    }

    /** Stop mesh networking */
    stop(): void {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        this.channel?.close();
        this.channel = null;
        this.isOnline = false;
        this.peers.clear();
        this.notifyListeners();
    }

    /** Subscribe to state changes */
    subscribe(listener: MeshListener): () => void {
        this.listeners.add(listener);
        listener(this.getState());
        return () => this.listeners.delete(listener);
    }

    /** Get current mesh state */
    getState(): MeshState {
        return {
            localPeerId: this.localPeerId,
            localPeerName: this.localPeerName,
            peers: Array.from(this.peers.values()),
            events: this.events.slice(-50),
            answers: this.answers,
            isOnline: this.isOnline,
        };
    }

    /** Ask the mesh a question */
    askMesh(query: string): string {
        const queryId = `q-${Date.now()}`;
        this.broadcast({
            type: 'ASK',
            payload: { type: 'ASK', queryId, query },
        });
        this.addEvent('query_received', this.localPeerId, this.localPeerName, `Asked: "${query}"`);
        return queryId;
    }

    /** Share knowledge with the mesh */
    shareKnowledge(entries: { title: string; content: string; sourceUrl?: string; tags: string[] }[]): void {
        this.broadcast({
            type: 'SHARE',
            payload: { type: 'SHARE', entries },
        });
        this.addEvent('knowledge_shared', this.localPeerId, this.localPeerName,
            `Shared ${entries.length} knowledge ${entries.length === 1 ? 'entry' : 'entries'}`
        );
    }

    // ── Private Methods ──

    private broadcast(partial: Pick<MeshMessage, 'type' | 'payload'>): void {
        if (!this.channel) return;

        const message: MeshMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            type: partial.type,
            senderId: this.localPeerId,
            senderName: this.localPeerName,
            timestamp: Date.now(),
            payload: partial.payload,
            hops: 0,
            maxHops: 3,
        };

        this.channel.postMessage(message);
    }

    private handleMessage(msg: MeshMessage): void {
        // Ignore own messages
        if (msg.senderId === this.localPeerId) return;

        switch (msg.payload.type) {
            case 'PING':
                this.updatePeer(msg.senderId, msg.senderName);
                this.broadcast({ type: 'PONG', payload: { type: 'PONG' } });
                break;

            case 'PONG':
                this.updatePeer(msg.senderId, msg.senderName);
                break;

            case 'ANNOUNCE':
                this.handleAnnounce(msg);
                break;

            case 'ASK':
                this.handleAsk(msg);
                break;

            case 'ANSWER':
                this.handleAnswer(msg);
                break;

            case 'SHARE':
                this.handleShare(msg);
                break;
        }

        this.notifyListeners();
    }

    private handleAnnounce(msg: MeshMessage): void {
        const payload = msg.payload as { type: 'ANNOUNCE'; capabilities: string[]; knowledgeCount: number };
        const isNew = !this.peers.has(msg.senderId);

        this.peers.set(msg.senderId, {
            peerId: msg.senderId,
            displayName: msg.senderName,
            publicKey: `pk_${msg.senderId}`,
            capabilities: payload.capabilities,
            trustScore: 0.5,
            lastSeen: Date.now(),
            isOnline: true,
            knowledgeCount: payload.knowledgeCount,
        });

        if (isNew) {
            this.addEvent('peer_joined', msg.senderId, msg.senderName,
                `Joined with ${payload.knowledgeCount} knowledge entries`
            );
            // Announce back
            this.broadcast({
                type: 'ANNOUNCE',
                payload: {
                    type: 'ANNOUNCE',
                    capabilities: ['search', 'knowledge', 'index'],
                    knowledgeCount: getKnowledgeCount(),
                },
            });
        }
    }

    private handleAsk(msg: MeshMessage): void {
        const payload = msg.payload as { type: 'ASK'; queryId: string; query: string };
        this.addEvent('query_received', msg.senderId, msg.senderName, `Asking: "${payload.query}"`);

        // Search local knowledge and respond
        import('./knowledge').then(({ searchKnowledge }) => {
            const results = searchKnowledge(payload.query, 2);
            if (results.length > 0) {
                const answer = results.map((r) => r.entry.content).join('\n\n');
                const sources = results
                    .map((r) => r.entry.sourceUrl)
                    .filter((s): s is string => !!s);

                this.broadcast({
                    type: 'ANSWER',
                    payload: {
                        type: 'ANSWER',
                        queryId: payload.queryId,
                        answer,
                        sources,
                    },
                });

                this.addEvent('query_answered', this.localPeerId, this.localPeerName,
                    `Answered ${msg.senderName}'s query with ${results.length} results`
                );
            }
        });
    }

    private handleAnswer(msg: MeshMessage): void {
        const payload = msg.payload as { type: 'ANSWER'; queryId: string; answer: string; sources: string[] };
        this.addEvent('query_answered', msg.senderId, msg.senderName,
            `Answered with ${payload.answer.length} chars`
        );
        // Store the answer
        this.answers.push({
            queryId: payload.queryId,
            answer: payload.answer,
            sources: payload.sources || [],
            peerId: msg.senderId,
            peerName: msg.senderName,
        });
        // Keep only recent 50 answers
        if (this.answers.length > 50) this.answers.shift();

        // Increase trust for helpful peers
        this.adjustTrust(msg.senderId, 0.1);
    }

    private handleShare(msg: MeshMessage): void {
        const payload = msg.payload as { type: 'SHARE'; entries: { title: string; content: string; sourceUrl?: string; tags: string[] }[] };
        this.addEvent('knowledge_shared', msg.senderId, msg.senderName,
            `Shared ${payload.entries.length} knowledge entries`
        );

        // Import shared knowledge
        import('./database').then(({ addKnowledge }) => {
            for (const entry of payload.entries) {
                addKnowledge({
                    ...entry,
                    sourceType: 'peer',
                    trustScore: this.peers.get(msg.senderId)?.trustScore ?? 0.5,
                    peerId: msg.senderId,
                });
            }
        });
    }

    private updatePeer(peerId: string, peerName: string): void {
        const existing = this.peers.get(peerId);
        if (existing) {
            existing.lastSeen = Date.now();
            existing.isOnline = true;
        } else {
            this.peers.set(peerId, {
                peerId,
                displayName: peerName,
                publicKey: `pk_${peerId}`,
                capabilities: [],
                trustScore: 0.5,
                lastSeen: Date.now(),
                isOnline: true,
                knowledgeCount: 0,
            });
        }
    }

    private adjustTrust(peerId: string, delta: number): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.trustScore = Math.max(0, Math.min(1, peer.trustScore + delta));
        }
    }

    private cleanupStalePeers(): void {
        const now = Date.now();
        for (const [id, peer] of this.peers) {
            if (now - peer.lastSeen > PEER_TIMEOUT) {
                peer.isOnline = false;
                this.addEvent('peer_left', id, peer.displayName, 'Connection timed out');
            }
        }
        this.notifyListeners();
    }

    private addEvent(
        type: MeshEvent['type'],
        peerId: string,
        peerName: string,
        detail: string
    ): void {
        this.events.push({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            type,
            peerId,
            peerName,
            detail,
            timestamp: Date.now(),
        });
        // Keep last 100 events
        if (this.events.length > 100) this.events = this.events.slice(-100);
    }

    private notifyListeners(): void {
        const state = this.getState();
        for (const listener of this.listeners) {
            listener(state);
        }
    }
}

// Singleton instance
export const peerManager = new PeerManager();

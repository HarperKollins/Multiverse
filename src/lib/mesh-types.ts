// ── Multiverse Mesh Types ──
// Protocol message types for P2P agent communication

export interface PeerInfo {
    peerId: string;
    displayName: string;
    publicKey: string;
    capabilities: string[];
    trustScore: number;
    lastSeen: number;
    isOnline: boolean;
    knowledgeCount: number;
    ip?: string;
}

export type MeshMessageType =
    | 'PING'
    | 'PONG'
    | 'ANNOUNCE'
    | 'ASK'
    | 'ANSWER'
    | 'SHARE'
    | 'TRUST_VOTE';

export interface MeshMessage {
    id: string;
    type: MeshMessageType;
    senderId: string;
    senderName: string;
    timestamp: number;
    payload: MeshPayload;
    hops: number;
    maxHops: number;
}

export type MeshPayload =
    | { type: 'PING' }
    | { type: 'PONG' }
    | { type: 'ANNOUNCE'; capabilities: string[]; knowledgeCount: number }
    | { type: 'ASK'; queryId: string; query: string }
    | { type: 'ANSWER'; queryId: string; answer: string; sources: string[] }
    | { type: 'SHARE'; entries: SharedKnowledge[] }
    | { type: 'TRUST_VOTE'; targetPeerId: string; score: number };

export interface SharedKnowledge {
    title: string;
    content: string;
    sourceUrl?: string;
    tags: string[];
}

export interface MeshEvent {
    id: string;
    type: 'peer_joined' | 'peer_left' | 'knowledge_shared' | 'query_received' | 'query_answered';
    peerId: string;
    peerName: string;
    detail: string;
    timestamp: number;
}

export interface MeshAnswer {
    queryId: string;
    answer: string;
    sources: string[];
    peerId: string;
    peerName: string;
}

export interface MeshState {
    localPeerId: string;
    localPeerName: string;
    peers: PeerInfo[];
    events: MeshEvent[];
    answers: MeshAnswer[];
    isOnline: boolean;
}

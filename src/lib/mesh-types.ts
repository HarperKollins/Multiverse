// ── Multiverse Mesh Types ──
// Protocol types for all mesh communication (local + cross-network)

export interface PeerInfo {
    peerId: string;
    displayName: string;
    capabilities: string[];
    knowledgeCount: number;
    trustScore: number;
    isOnline: boolean;
    lastSeen: number;
    publicKey?: string;        // Ed25519 public key (hex)
    transport: 'local' | 'webrtc' | 'both';  // How we're connected
}

// ── Message Types ──

export type MeshMessageType =
    | 'PING' | 'PONG'
    | 'ANNOUNCE'
    | 'QUERY' | 'ANSWER'
    | 'SHARE'
    | 'TRUST_VOTE';

export interface MeshMessage {
    type: MeshMessageType;
    fromPeerId: string;
    fromPeerName: string;
    timestamp: number;
    signature?: string;        // Ed25519 signature (hex)
    payload: MeshPayload;
}

// ── Payloads ──

export type MeshPayload =
    | PingPayload
    | PongPayload
    | AnnouncePayload
    | QueryPayload
    | AnswerPayload
    | SharePayload
    | TrustVotePayload;

export interface PingPayload {
    kind: 'ping';
}

export interface PongPayload {
    kind: 'pong';
    knowledgeCount: number;
}

export interface AnnouncePayload {
    kind: 'announce';
    capabilities: string[];
    knowledgeCount: number;
    publicKey?: string;
}

export interface QueryPayload {
    kind: 'query';
    queryId: string;
    question: string;
    requiredCapabilities?: string[];
}

export interface AnswerPayload {
    kind: 'answer';
    queryId: string;
    answer: string;
    confidence: number;
    sources: string[];
}

export interface SharePayload {
    kind: 'share';
    entries: Array<{
        title: string;
        content: string;
        sourceUrl?: string;
        trustScore: number;
        tags?: string[];
    }>;
}

export interface TrustVotePayload {
    kind: 'trust_vote';
    targetPeerId: string;
    knowledgeId: string;
    vote: 'confirm' | 'dispute';
    reason?: string;
}

// ── Events for UI ──

export interface MeshEvent {
    id: string;
    type: 'peer_joined' | 'peer_left' | 'knowledge_shared' | 'query_received' | 'query_answered';
    peerName: string;
    peerId: string;
    detail: string;
    timestamp: number;
}

// ── Global Mesh State ──

export interface MeshState {
    isOnline: boolean;
    localPeerId: string;
    localPeerName: string;
    peers: PeerInfo[];
    events: MeshEvent[];
    // Transport info
    localTransport: 'broadcast' | 'webrtc' | 'both';
    signalingConnected: boolean;
    webrtcPeerCount: number;
}

// ── Mesh Answer (for UI display) ──

export interface MeshAnswer {
    queryId: string;
    peerId: string;
    peerName: string;
    answer: string;
    confidence: number;
    receivedAt: number;
}

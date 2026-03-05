// ── Multiverse Mesh Types ──
// Protocol types for mesh communication. Backward-compatible with existing peer-manager.

export interface PeerInfo {
    peerId: string;
    displayName: string;
    capabilities: string[];
    knowledgeCount: number;
    trustScore: number;
    isOnline: boolean;
    lastSeen: number;
    publicKey?: string;
    transport?: 'local' | 'webrtc' | 'both';
}

// ── Message Types ──

export type MeshMessageType =
    | 'PING' | 'PONG'
    | 'ANNOUNCE'
    | 'ASK' | 'ANSWER'
    | 'SHARE'
    | 'TRUST_VOTE'
    // New aliases (for WebRTC transport compatibility)
    | 'QUERY';

export interface MeshMessage {
    type: MeshMessageType;
    // Old peer-manager uses senderId/senderName
    senderId?: string;
    senderName?: string;
    // New WebRTC transport uses fromPeerId/fromPeerName
    fromPeerId?: string;
    fromPeerName?: string;
    // Shared
    id?: string;
    timestamp: number;
    signature?: string;
    payload: MeshPayload;
}

// ── Payloads (flexible: supports both old {type} and new {kind} discriminators) ──

export type MeshPayload = Record<string, any>;

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
    answers: MeshAnswer[];
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
    confidence?: number;
    sources?: string[];
    receivedAt: number;
}

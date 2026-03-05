// ── Multiverse WebRTC Transport ──
// Handles cross-location P2P connections via WebRTC Data Channels.
// Uses a signaling server for initial peer discovery, then establishes
// direct encrypted connections using STUN for NAT traversal.
//
// Architecture:
//   Browser A ──WebSocket──→ Signaling Server ←──WebSocket── Browser B
//                     (initial handshake only)
//   Browser A ────────── WebRTC DataChannel ──────────── Browser B
//                     (direct, encrypted, P2P)

import type { MeshMessage } from './mesh-types';

// Public STUN servers for NAT traversal (free, no account needed)
const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
];

interface PeerConnection {
    peerId: string;
    displayName: string;
    pc: RTCPeerConnection;
    dc: RTCDataChannel | null;
    isConnected: boolean;
}

type MessageHandler = (peerId: string, message: MeshMessage) => void;
type ConnectionHandler = (peerId: string, displayName: string) => void;

export class WebRTCTransport {
    private ws: WebSocket | null = null;
    private connections: Map<string, PeerConnection> = new Map();
    private localPeerId: string;
    private localDisplayName: string;
    private signalingUrl: string;
    private onMessage: MessageHandler;
    private onPeerConnect: ConnectionHandler;
    private onPeerDisconnect: ConnectionHandler;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: {
        peerId: string;
        displayName: string;
        signalingUrl?: string;
        onMessage: MessageHandler;
        onPeerConnect: ConnectionHandler;
        onPeerDisconnect: ConnectionHandler;
    }) {
        this.localPeerId = options.peerId;
        this.localDisplayName = options.displayName;
        this.signalingUrl = options.signalingUrl || 'ws://localhost:9090';
        this.onMessage = options.onMessage;
        this.onPeerConnect = options.onPeerConnect;
        this.onPeerDisconnect = options.onPeerDisconnect;
    }

    // ── Connect to signaling server ──
    async connect(knowledgeCount: number = 0, capabilities: string[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.signalingUrl);

                this.ws.onopen = () => {
                    console.log('[WebRTC] Connected to signaling server');
                    this.ws!.send(JSON.stringify({
                        type: 'register',
                        peerId: this.localPeerId,
                        displayName: this.localDisplayName,
                        knowledgeCount,
                        capabilities,
                    }));
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        this.handleSignalingMessage(msg);
                    } catch (e) {
                        console.error('[WebRTC] Invalid signaling message:', e);
                    }
                };

                this.ws.onclose = () => {
                    console.log('[WebRTC] Signaling server disconnected');
                    this.scheduleReconnect(knowledgeCount, capabilities);
                };

                this.ws.onerror = (err) => {
                    console.warn('[WebRTC] Signaling error (server may not be running):', err);
                    reject(new Error('Signaling server connection failed'));
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    private scheduleReconnect(knowledgeCount: number, capabilities: string[]): void {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            console.log('[WebRTC] Attempting reconnect...');
            this.connect(knowledgeCount, capabilities).catch(() => {
                // Will retry on next cycle
            });
        }, 5000);
    }

    // ── Handle messages from signaling server ──
    private async handleSignalingMessage(msg: any): Promise<void> {
        switch (msg.type) {
            case 'peer_list': {
                // Connect to each existing peer
                for (const peer of msg.peers) {
                    await this.initiateConnection(peer.peerId, peer.displayName);
                }
                break;
            }

            case 'peer_joined': {
                // New peer joined — they will initiate connection to us
                console.log(`[WebRTC] New peer: ${msg.peer.displayName}`);
                break;
            }

            case 'peer_left': {
                this.handlePeerDisconnect(msg.peerId);
                break;
            }

            case 'signal': {
                // WebRTC signaling data from another peer
                await this.handleSignal(msg.fromPeerId, msg.signal);
                break;
            }
        }
    }

    // ── Create WebRTC connection to a peer ──
    private async initiateConnection(peerId: string, displayName: string): Promise<void> {
        if (this.connections.has(peerId)) return;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        const connection: PeerConnection = { peerId, displayName, pc, dc: null, isConnected: false };
        this.connections.set(peerId, connection);

        // Create data channel
        const dc = pc.createDataChannel('multiverse', { ordered: true });
        connection.dc = dc;
        this.setupDataChannel(dc, peerId, displayName);

        // ICE candidates → send to peer via signaling
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(peerId, {
                    type: 'ice-candidate',
                    candidate: event.candidate,
                });
            }
        };

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignal(peerId, {
            type: 'offer',
            sdp: offer,
        });
    }

    // ── Handle incoming WebRTC signals ──
    private async handleSignal(fromPeerId: string, signal: any): Promise<void> {
        if (signal.type === 'offer') {
            // Incoming offer — create answer
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            const connection: PeerConnection = {
                peerId: fromPeerId,
                displayName: fromPeerId.slice(0, 8),
                pc,
                dc: null,
                isConnected: false,
            };
            this.connections.set(fromPeerId, connection);

            // Listen for incoming data channel
            pc.ondatachannel = (event) => {
                connection.dc = event.channel;
                this.setupDataChannel(event.channel, fromPeerId, connection.displayName);
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendSignal(fromPeerId, {
                        type: 'ice-candidate',
                        candidate: event.candidate,
                    });
                }
            };

            await pc.setRemoteDescription(signal.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.sendSignal(fromPeerId, {
                type: 'answer',
                sdp: answer,
            });

        } else if (signal.type === 'answer') {
            const connection = this.connections.get(fromPeerId);
            if (connection) {
                await connection.pc.setRemoteDescription(signal.sdp);
            }

        } else if (signal.type === 'ice-candidate') {
            const connection = this.connections.get(fromPeerId);
            if (connection) {
                await connection.pc.addIceCandidate(signal.candidate);
            }
        }
    }

    // ── Setup data channel event handlers ──
    private setupDataChannel(dc: RTCDataChannel, peerId: string, displayName: string): void {
        dc.onopen = () => {
            console.log(`[WebRTC] Data channel open with ${displayName} (${peerId})`);
            const conn = this.connections.get(peerId);
            if (conn) conn.isConnected = true;
            this.onPeerConnect(peerId, displayName);
        };

        dc.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as MeshMessage;
                this.onMessage(peerId, message);
            } catch (e) {
                console.error('[WebRTC] Invalid data channel message:', e);
            }
        };

        dc.onclose = () => {
            console.log(`[WebRTC] Data channel closed with ${peerId}`);
            this.handlePeerDisconnect(peerId);
        };
    }

    private handlePeerDisconnect(peerId: string): void {
        const conn = this.connections.get(peerId);
        if (conn) {
            conn.pc.close();
            this.connections.delete(peerId);
            this.onPeerDisconnect(peerId, conn.displayName);
        }
    }

    // ── Send signal via signaling server ──
    private sendSignal(targetPeerId: string, signal: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'signal',
                targetPeerId,
                signal,
            }));
        }
    }

    // ── Send message to a specific peer ──
    send(peerId: string, message: MeshMessage): boolean {
        const conn = this.connections.get(peerId);
        if (conn?.dc?.readyState === 'open') {
            conn.dc.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    // ── Broadcast to all connected peers ──
    broadcast(message: MeshMessage): void {
        for (const [peerId, conn] of this.connections) {
            if (conn.dc?.readyState === 'open') {
                conn.dc.send(JSON.stringify(message));
            }
        }
    }

    // ── Get connected peer IDs ──
    getConnectedPeers(): string[] {
        return Array.from(this.connections.entries())
            .filter(([_, conn]) => conn.isConnected)
            .map(([id]) => id);
    }

    getPeerCount(): number {
        return this.getConnectedPeers().length;
    }

    // ── Disconnect all ──
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        for (const [_, conn] of this.connections) {
            conn.pc.close();
        }
        this.connections.clear();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

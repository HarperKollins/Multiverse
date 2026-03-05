// ── Multiverse Signaling Server ──
// Lightweight WebSocket server for WebRTC peer discovery.
// Peers connect here to find each other, then establish direct WebRTC connections.
// This server does NOT relay any data — only facilitates the initial handshake.
//
// Usage:
//   cd signaling-server && npm install && npm start
//   Server runs on port 9090 by default (configurable via PORT env var)

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 9090;
const MAX_PEERS = 100;

// Connected peers: peerId -> { ws, info }
const peers = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`
╔══════════════════════════════════════════╗
║   Multiverse Signaling Server            ║
║   Port: ${PORT}                              ║
║                                          ║
║   Peers connect here to discover         ║
║   each other across any network.         ║
║   No data is relayed — only handshakes.  ║
╚══════════════════════════════════════════╝
`);

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    let peerId = null;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());

            switch (msg.type) {
                case 'register': {
                    // Peer announces itself
                    if (peers.size >= MAX_PEERS) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Server full' }));
                        ws.close();
                        return;
                    }

                    peerId = msg.peerId;
                    peers.set(peerId, {
                        ws,
                        info: {
                            peerId: msg.peerId,
                            displayName: msg.displayName || 'Anonymous Node',
                            capabilities: msg.capabilities || [],
                            knowledgeCount: msg.knowledgeCount || 0,
                        },
                    });

                    console.log(`[+] Peer joined: ${msg.displayName} (${peerId}) from ${ip}`);

                    // Send peer list to new peer
                    const peerList = [];
                    for (const [id, p] of peers) {
                        if (id !== peerId) {
                            peerList.push(p.info);
                        }
                    }
                    ws.send(JSON.stringify({ type: 'peer_list', peers: peerList }));

                    // Notify existing peers about new peer
                    broadcast(peerId, {
                        type: 'peer_joined',
                        peer: peers.get(peerId).info,
                    });
                    break;
                }

                case 'signal': {
                    // WebRTC signaling (SDP offer/answer, ICE candidates)
                    // Forward to target peer
                    const target = peers.get(msg.targetPeerId);
                    if (target && target.ws.readyState === 1) {
                        target.ws.send(JSON.stringify({
                            type: 'signal',
                            fromPeerId: peerId,
                            signal: msg.signal,
                        }));
                    }
                    break;
                }

                case 'ping': {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;
                }

                default:
                    console.log(`[?] Unknown message type: ${msg.type}`);
            }
        } catch (e) {
            console.error('[!] Invalid message:', e.message);
        }
    });

    ws.on('close', () => {
        if (peerId) {
            const peerInfo = peers.get(peerId)?.info;
            peers.delete(peerId);
            console.log(`[-] Peer left: ${peerInfo?.displayName || peerId}`);

            // Notify remaining peers
            broadcast(peerId, {
                type: 'peer_left',
                peerId,
            });
        }
    });

    ws.on('error', (err) => {
        console.error(`[!] WebSocket error for ${peerId}:`, err.message);
    });
});

function broadcast(excludePeerId, message) {
    const data = JSON.stringify(message);
    for (const [id, peer] of peers) {
        if (id !== excludePeerId && peer.ws.readyState === 1) {
            peer.ws.send(data);
        }
    }
}

// Periodic cleanup of stale connections
setInterval(() => {
    for (const [id, peer] of peers) {
        if (peer.ws.readyState !== 1) {
            peers.delete(id);
            broadcast(id, { type: 'peer_left', peerId: id });
        }
    }
}, 30000);

import { useState, useEffect } from 'react';
import type { MeshState, MeshEvent, PeerInfo } from '../lib/mesh-types';
import { peerManager } from '../lib/peer-manager';
import './TopologyView.css';

export default function TopologyView() {
    const [meshState, setMeshState] = useState<MeshState>(peerManager.getState());

    useEffect(() => {
        peerManager.start();
        const unsub = peerManager.subscribe(setMeshState);
        return () => {
            unsub();
        };
    }, []);

    const onlinePeers = meshState.peers.filter((p) => p.isOnline);
    const totalKnowledge = meshState.peers.reduce((sum, p) => sum + p.knowledgeCount, 0);

    return (
        <div className="topology">
            {/* Network Stats */}
            <div className="topo-stats">
                <div className="topo-stat">
                    <span className="topo-stat-value">{onlinePeers.length}</span>
                    <span className="topo-stat-label mono">PEERS ONLINE</span>
                </div>
                <div className="topo-stat">
                    <span className="topo-stat-value">{totalKnowledge}</span>
                    <span className="topo-stat-label mono">MESH KNOWLEDGE</span>
                </div>
                <div className="topo-stat">
                    <span className={`topo-stat-value ${meshState.isOnline ? 'text-accent' : ''}`}>
                        {meshState.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <span className="topo-stat-label mono">MESH STATUS</span>
                </div>
            </div>

            <div className="topo-content">
                {/* Network Visualization */}
                <div className="topo-network">
                    <div className="topo-viz">
                        <NetworkGraph
                            localId={meshState.localPeerId}
                            localName={meshState.localPeerName}
                            peers={meshState.peers}
                        />
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="topo-feed">
                    <h3 className="feed-title mono">MESH ACTIVITY</h3>
                    <div className="feed-list">
                        {meshState.events.length === 0 ? (
                            <div className="feed-empty">
                                <span className="text-muted">No activity yet. Open another tab at</span>
                                <code className="feed-hint mono">localhost:1420</code>
                                <span className="text-muted">to connect a peer.</span>
                            </div>
                        ) : (
                            meshState.events
                                .slice()
                                .reverse()
                                .slice(0, 20)
                                .map((event) => <EventItem key={event.id} event={event} />)
                        )}
                    </div>
                </div>
            </div>

            {/* Peer Cards */}
            {onlinePeers.length > 0 && (
                <div className="topo-peers">
                    <h3 className="feed-title mono">CONNECTED PEERS</h3>
                    <div className="peer-grid">
                        {onlinePeers.map((peer) => (
                            <PeerCard key={peer.peerId} peer={peer} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function NetworkGraph({
    localId,
    localName,
    peers,
}: {
    localId: string;
    localName: string;
    peers: PeerInfo[];
}) {
    const onlinePeers = peers.filter((p) => p.isOnline);
    const cx = 200;
    const cy = 120;
    const radius = 80;

    return (
        <svg width="100%" height="240" viewBox="0 0 400 240" className="network-svg">
            {/* Background grid */}
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-subtle)" strokeWidth="0.3" />
                </pattern>
                <radialGradient id="nodeGlow">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect width="400" height="240" fill="url(#grid)" />

            {/* Connection lines */}
            {onlinePeers.map((peer, i) => {
                const angle = (i / Math.max(onlinePeers.length, 1)) * Math.PI * 2 - Math.PI / 2;
                const px = cx + Math.cos(angle) * radius;
                const py = cy + Math.sin(angle) * radius;
                return (
                    <line
                        key={`line-${peer.peerId}`}
                        x1={cx} y1={cy} x2={px} y2={py}
                        stroke="var(--accent-primary)"
                        strokeWidth="1"
                        opacity="0.3"
                        strokeDasharray="4 4"
                    >
                        <animate attributeName="stroke-dashoffset" from="8" to="0" dur="2s" repeatCount="indefinite" />
                    </line>
                );
            })}

            {/* Local node (center) */}
            <circle cx={cx} cy={cy} r="20" fill="url(#nodeGlow)" />
            <circle cx={cx} cy={cy} r="12" fill="var(--bg-elevated)" stroke="var(--accent-primary)" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="4" fill="var(--accent-primary)" />
            <text x={cx} y={cy + 26} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">
                {localName}
            </text>
            <text x={cx} y={cy + 38} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-mono)">
                {localId}
            </text>

            {/* Peer nodes */}
            {onlinePeers.map((peer, i) => {
                const angle = (i / Math.max(onlinePeers.length, 1)) * Math.PI * 2 - Math.PI / 2;
                const px = cx + Math.cos(angle) * radius;
                const py = cy + Math.sin(angle) * radius;
                return (
                    <g key={peer.peerId}>
                        <circle cx={px} cy={py} r="8" fill="var(--bg-elevated)" stroke="var(--accent-dim)" strokeWidth="1.5" />
                        <circle cx={px} cy={py} r="3" fill="var(--accent-dim)" />
                        <text x={px} y={py + 18} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontFamily="var(--font-mono)">
                            {peer.displayName}
                        </text>
                    </g>
                );
            })}

            {/* Empty state */}
            {onlinePeers.length === 0 && (
                <text x={cx} y={cy + 60} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)">
                    Scanning for peers...
                </text>
            )}
        </svg>
    );
}

function PeerCard({ peer }: { peer: PeerInfo }) {
    const trustPercent = Math.round(peer.trustScore * 100);
    const trustColor =
        peer.trustScore > 0.7 ? 'var(--status-online)' :
            peer.trustScore > 0.4 ? 'var(--status-warning)' :
                'var(--status-error)';

    return (
        <div className="peer-card">
            <div className="pc-header">
                <div className="pc-avatar">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="var(--accent-dim)" strokeWidth="1" />
                        <circle cx="8" cy="8" r="2.5" fill="var(--accent-dim)" />
                    </svg>
                </div>
                <div>
                    <span className="pc-name">{peer.displayName}</span>
                    <span className="pc-id mono">{peer.peerId}</span>
                </div>
                <span className="pc-online-dot" />
            </div>
            <div className="pc-stats">
                <div className="pc-stat">
                    <span className="pc-stat-label mono">TRUST</span>
                    <div className="pc-trust-bar">
                        <div className="pc-trust-fill" style={{ width: `${trustPercent}%`, background: trustColor }} />
                    </div>
                    <span className="pc-stat-value mono" style={{ color: trustColor }}>{trustPercent}%</span>
                </div>
                <div className="pc-stat">
                    <span className="pc-stat-label mono">KNOWLEDGE</span>
                    <span className="pc-stat-value mono">{peer.knowledgeCount}</span>
                </div>
            </div>
            {peer.capabilities.length > 0 && (
                <div className="pc-caps">
                    {peer.capabilities.map((cap) => (
                        <span key={cap} className="pc-cap mono">{cap}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

function EventItem({ event }: { event: MeshEvent }) {
    const icon = {
        peer_joined: '🟢',
        peer_left: '🔴',
        knowledge_shared: '📚',
        query_received: '❓',
        query_answered: '✅',
    }[event.type];

    const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div className="feed-item">
            <span className="feed-icon">{icon}</span>
            <span className="feed-peer mono">{event.peerName}</span>
            <span className="feed-detail">{event.detail}</span>
            <span className="feed-time mono">{time}</span>
        </div>
    );
}

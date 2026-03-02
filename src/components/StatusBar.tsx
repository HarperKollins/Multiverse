import { useState, useEffect } from "react";
import { peerManager } from "../lib/peer-manager";
import type { MeshState } from "../lib/mesh-types";
import { getKnowledgeCount } from "../lib/database";
import "./StatusBar.css";

export default function StatusBar() {
    const [meshState, setMeshState] = useState<MeshState | null>(null);
    const [knowledgeCount, setKnowledgeCount] = useState(0);

    useEffect(() => {
        const unsub = peerManager.subscribe(setMeshState);
        setKnowledgeCount(getKnowledgeCount());

        // Refresh knowledge count periodically
        const interval = setInterval(() => {
            setKnowledgeCount(getKnowledgeCount());
        }, 5000);

        return () => {
            unsub();
            clearInterval(interval);
        };
    }, []);

    const onlinePeers = meshState?.peers.filter((p) => p.isOnline).length ?? 0;

    return (
        <footer className="statusbar">
            <div className="statusbar-left">
                <span className="status-indicator online">
                    <span className="status-dot"></span>
                    <span className="mono">SYSTEM ONLINE</span>
                </span>
                <span className="status-divider">|</span>
                <span className="status-metric mono">
                    ⊚ RAM: 32.4%
                </span>
            </div>

            <div className="statusbar-center">
                <span className="status-metric mono">
                    📚 {knowledgeCount} entries
                </span>
                <span className="status-divider">•</span>
                <span className={`status-metric mono ${onlinePeers > 0 ? 'text-accent' : ''}`}>
                    🌐 {onlinePeers} {onlinePeers === 1 ? 'peer' : 'peers'}
                </span>
            </div>

            <div className="statusbar-right">
                <span className="status-metric mono">
                    PEER MAP: <span className="text-accent">{meshState?.localPeerName ?? '...'}</span>
                </span>
                <span className="status-divider">|</span>
                <span className="status-indicator privacy">
                    <span className="status-dot" style={{ background: "var(--status-online)" }}></span>
                    <span className="mono">PRIVACY: 98%</span>
                </span>
            </div>
        </footer>
    );
}

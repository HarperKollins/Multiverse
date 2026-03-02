import { useState } from "react";
import "./Sidebar.css";

interface NavItem {
    id: string;
    label: string;
    icon: string;
}

const protocols: NavItem[] = [
    { id: "knowledge", label: "Knowledge Slabs", icon: "📘" },
    { id: "neural", label: "Neural Nets", icon: "🧠" },
    { id: "archives", label: "Archives", icon: "📁" },
    { id: "nodes", label: "Nodes", icon: "⬡" },
];

export default function Sidebar() {
    const [activeItem, setActiveItem] = useState("knowledge");

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <circle cx="14" cy="14" r="12" stroke="var(--accent-primary)" strokeWidth="1.5" opacity="0.4" />
                            <circle cx="14" cy="14" r="7" stroke="var(--accent-primary)" strokeWidth="1.5" opacity="0.7" />
                            <circle cx="14" cy="14" r="3" fill="var(--accent-primary)" />
                            <line x1="14" y1="2" x2="14" y2="8" stroke="var(--accent-primary)" strokeWidth="1" opacity="0.3" />
                            <line x1="14" y1="20" x2="14" y2="26" stroke="var(--accent-primary)" strokeWidth="1" opacity="0.3" />
                            <line x1="2" y1="14" x2="8" y2="14" stroke="var(--accent-primary)" strokeWidth="1" opacity="0.3" />
                            <line x1="20" y1="14" x2="26" y2="14" stroke="var(--accent-primary)" strokeWidth="1" opacity="0.3" />
                        </svg>
                    </div>
                    <div className="logo-text">
                        <span className="logo-title">MULTIVERSE</span>
                        <span className="logo-subtitle mono">[NODE_ID: 0x4f...]</span>
                    </div>
                </div>
            </div>

            <div className="sidebar-section">
                <span className="section-label">PROTOCOLS</span>
                <nav className="sidebar-nav">
                    {protocols.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeItem === item.id ? "active" : ""}`}
                            onClick={() => setActiveItem(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            <div className="sidebar-footer">
                <button className="nav-item system-config">
                    <span className="nav-icon">⚙</span>
                    <span className="nav-label">System Config</span>
                </button>
            </div>
        </aside>
    );
}

import "./StatusBar.css";

export default function StatusBar() {
    return (
        <footer className="statusbar">
            <div className="statusbar-left">
                <span className="status-indicator">
                    <span className="indicator-dot online" />
                    <span className="mono">SYSTEM ONLINE</span>
                </span>
                <span className="statusbar-divider" />
                <span className="status-metric">
                    <span className="metric-icon">⊕</span>
                    <span className="mono">RAM: 32.4%</span>
                </span>
            </div>

            <div className="statusbar-center">
                <div className="center-dots">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <span key={i} className={`dot ${i === 2 ? "dot-active" : ""}`} />
                    ))}
                </div>
            </div>

            <div className="statusbar-right">
                <span className="status-metric mono">
                    PEER MAP: <span className="text-accent">US_WEST_2</span>
                </span>
                <span className="statusbar-divider" />
                <span className="privacy-badge">
                    <span className="privacy-dot" />
                    <span className="mono">PRIVACY: 98%</span>
                </span>
            </div>
        </footer>
    );
}

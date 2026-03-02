import "./CommandBar.css";

export default function CommandBar() {
    return (
        <div className="commandbar">
            <div className="commandbar-inner">
                <div className="commandbar-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4L6 8L2 12" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="8" y1="12" x2="14" y2="12" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    </svg>
                </div>
                <span className="commandbar-prefix mono">[LOCAL_LLM]</span>
                <input
                    type="text"
                    className="commandbar-input mono"
                    placeholder="query_sector_7"
                    spellCheck={false}
                />
                <div className="commandbar-actions">
                    <span className="status-badge online">
                        <span className="status-dot"></span>
                        READY
                    </span>
                    <span className="shortcut-badge mono">CMD+K</span>
                </div>
            </div>
        </div>
    );
}

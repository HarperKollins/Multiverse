import { useState } from "react";
import "./CommandBar.css";

interface Props {
    onQuery?: (query: string) => void;
}

export default function CommandBar({ onQuery }: Props) {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim()) return;

        const input = value.trim();

        // Check if it's a URL
        const isUrl = /^https?:\/\//i.test(input) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(input);

        if (isUrl) {
            // Future: navigate webview
            console.log('[NAV]', input);
        } else {
            // Route to agent
            onQuery?.(input);
        }

        setValue('');
    };

    return (
        <div className="commandbar">
            <form className="commandbar-inner" onSubmit={handleSubmit}>
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
                    placeholder="Search knowledge or enter URL..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    spellCheck={false}
                />
                <div className="commandbar-actions">
                    <span className="status-badge online">
                        <span className="status-dot"></span>
                        READY
                    </span>
                    <span className="shortcut-badge mono">CMD+K</span>
                </div>
            </form>
        </div>
    );
}

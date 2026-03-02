import type { SearchResult } from '../lib/types';
import './KnowledgeCard.css';

interface Props {
    result: SearchResult;
}

export default function KnowledgeCard({ result }: Props) {
    const { entry, score, matchedTerms } = result;
    const relativeTime = getRelativeTime(entry.createdAt);

    return (
        <div className="knowledge-card">
            <div className="kc-header">
                <span className="kc-type-badge mono">{entry.sourceType.toUpperCase()}</span>
                <span className="kc-score mono">{Math.round(score * 100)}%</span>
            </div>
            <h4 className="kc-title">{entry.title}</h4>
            <p className="kc-content">{truncate(entry.content, 120)}</p>
            <div className="kc-footer">
                {entry.sourceUrl && (
                    <span className="kc-source mono" title={entry.sourceUrl}>
                        📎 {shortenUrl(entry.sourceUrl)}
                    </span>
                )}
                <span className="kc-time mono">{relativeTime}</span>
            </div>
            {matchedTerms.length > 0 && (
                <div className="kc-tags">
                    {matchedTerms.map((term) => (
                        <span key={term} className="kc-tag mono">{term}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trim() + '…';
}

function shortenUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.hostname.replace('www.', '');
    } catch {
        return url.slice(0, 30);
    }
}

function getRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
